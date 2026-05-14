import json
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from openai import OpenAI


DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
DISPLAY_SLOTS = ['8–10', '10–12', '1–3', '3–5']
NORMALIZED_SLOT_MAP = {
    '8-10': '8–10',
    '10-12': '10–12',
    '1-3': '1–3',
    '3-5': '3–5',
}


class OptimizationError(Exception):
    pass


@dataclass
class SlotCandidate:
    subject_code: str
    subject_name: str
    slot_name: str
    staff: str
    timings: List[dict]


def parse_timetable_text(raw_text: str) -> dict:
    ai_result = try_ai_parse(raw_text)
    if ai_result:
        return normalize_parsed_subjects(ai_result, raw_text)

    parsed = heuristic_parse(raw_text)
    return normalize_parsed_subjects(parsed, raw_text)


def try_ai_parse(raw_text: str) -> Optional[dict]:
    openai_api_key = get_setting('OPENAI_API_KEY', '')
    nvidia_api_key = get_setting('NVIDIA_API_KEY', '')
    api_key = openai_api_key or nvidia_api_key
    if not api_key:
        return None

    base_url = None
    model = get_setting('OPENAI_MODEL', 'gpt-4.1-mini')
    if nvidia_api_key and not openai_api_key:
        api_key = nvidia_api_key
        base_url = 'https://integrate.api.nvidia.com/v1'
        model = get_setting('NVIDIA_MODEL', 'meta/llama-3.1-70b-instruct')

    client = OpenAI(api_key=api_key, base_url=base_url)
    prompt = f"""
You are a timetable extraction system.

Extract subject code, subject name, slot name, staff name, and all day/time occurrences from this raw timetable text.
Return STRICT JSON with this shape:
{{
  "subjects": [
    {{
      "code": "19AI301",
      "name": "Python Programming",
      "slots": [
        {{
          "slot": "T2-Q13",
          "staff": "Krishnamoorthy J",
          "timings": [
            {{"day": "Monday", "start": "10:00", "end": "12:00"}}
          ]
        }}
      ]
    }}
  ]
}}

If input is messy, infer carefully from the text. Use Monday to Saturday only. Do not include Sunday.

RAW INPUT:
{raw_text[:14000]}
"""
    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': 'You extract structured academic timetable data.'},
                {'role': 'user', 'content': prompt},
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return None


def heuristic_parse(raw_text: str) -> dict:
    slot_group_map: Dict[str, dict] = {}
    day_pattern = r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)'
    time_pattern = r'(8\s*[-–]\s*10|10\s*[-–]\s*12|1\s*[-–]\s*3|3\s*[-–]\s*5)'

    for line in raw_text.splitlines():
        clean = ' '.join(line.strip().split())
        if len(clean) < 8:
            continue
        code_match = re.search(r'\b([A-Z0-9]{5,12})\b', clean)
        day_match = re.search(day_pattern, clean, re.IGNORECASE)
        time_match = re.search(time_pattern, clean)
        slot_match = re.search(r'\b([A-Z]{1,3}\d(?:-[A-Z0-9]+)+)\b', clean)
        if not (code_match and day_match and time_match and slot_match):
            continue

        code = code_match.group(1).upper()
        slot_name = slot_match.group(1).upper()
        day = normalize_day(day_match.group(1))
        display_slot = normalize_display_slot(time_match.group(1))
        start, end = display_slot_to_times(display_slot)

        code_index = clean.find(code_match.group(1))
        slot_index = clean.find(slot_match.group(1))
        name_part = clean[code_index + len(code):slot_index].strip(' -:|/')
        suffix = clean[slot_index + len(slot_match.group(1)):].strip(' -:|/')
        suffix = re.sub(day_pattern, '', suffix, flags=re.IGNORECASE)
        suffix = re.sub(time_pattern, '', suffix)
        suffix = suffix.strip(' -:|/')

        subject_name = name_part or f'Subject {code}'
        staff = suffix or 'Staff TBA'

        key = f'{code}::{slot_name}'
        group = slot_group_map.setdefault(
            key,
            {
                'code': code,
                'name': subject_name,
                'slot': slot_name,
                'staff': staff,
                'timings': [],
            },
        )
        group['name'] = group['name'] if group['name'] != f'Subject {code}' else subject_name
        if group['staff'] == 'Staff TBA' and staff != 'Staff TBA':
            group['staff'] = staff
        group['timings'].append({'day': day, 'start': start, 'end': end})

    subjects_map: Dict[str, dict] = defaultdict(lambda: {'code': '', 'name': '', 'slots': []})
    for group in slot_group_map.values():
        subject = subjects_map[group['code']]
        subject['code'] = group['code']
        subject['name'] = group['name']
        subject['slots'].append(
            {
                'slot': group['slot'],
                'staff': group['staff'],
                'timings': dedupe_timings(group['timings']),
            }
        )

    subjects = list(subjects_map.values())
    if not subjects:
        subjects = sample_subjects_from_raw_text(raw_text)

    return {'subjects': subjects}


def sample_subjects_from_raw_text(raw_text: str) -> List[dict]:
    fallback_subjects = []
    for index, line in enumerate([l for l in raw_text.splitlines() if l.strip()][:6], start=1):
        fallback_subjects.append(
            {
                'code': f'SUB{index:03d}',
                'name': line.strip()[:60],
                'slots': [],
            }
        )
    return fallback_subjects


def normalize_parsed_subjects(data: dict, raw_text: str) -> dict:
    subjects = []
    for subject in data.get('subjects', []):
        code = str(subject.get('code', '')).strip().upper()
        name = str(subject.get('name', '')).strip()
        if not code or not name:
            continue

        normalized_slots = []
        for slot in subject.get('slots', []):
            slot_name = str(slot.get('slot', '')).strip().upper()
            staff = str(slot.get('staff', '')).strip() or 'Staff TBA'
            timings = []
            for timing in slot.get('timings', []):
                day = normalize_day(timing.get('day', ''))
                start = normalize_time(timing.get('start', ''))
                end = normalize_time(timing.get('end', ''))
                if day and start and end:
                    timings.append({'day': day, 'start': start, 'end': end})
            if slot_name and timings:
                normalized_slots.append(
                    {
                        'slot': slot_name,
                        'staff': staff,
                        'timings': dedupe_timings(timings),
                    }
                )

        subjects.append({'code': code, 'name': name, 'slots': normalized_slots})

    return {
        'raw_text': raw_text,
        'subjects': subjects,
        'detected_subject_count': len(subjects),
    }


def optimize_subjects(subjects: List[dict], selected_subject_codes: List[str], preferences: dict) -> dict:
    selected_codes = {code.upper() for code in selected_subject_codes}
    selected_subjects = [subject for subject in subjects if subject.get('code', '').upper() in selected_codes]
    if not selected_subjects:
        raise OptimizationError('No valid selected subjects were supplied.')

    leave_day = normalize_day(preferences.get('leave_day', 'None')) or 'None'
    avoid_time_slots = {normalize_display_slot(slot) for slot in preferences.get('avoid_time_slots', []) if normalize_display_slot(slot)}
    preferred_staff = {k.upper(): v for k, v in (preferences.get('preferred_staff') or {}).items()}
    preferred_slots = {k.upper(): v.upper() for k, v in (preferences.get('preferred_slots') or {}).items()}

    candidates_by_subject: List[List[SlotCandidate]] = []
    for subject in selected_subjects:
        subject_candidates = []
        for slot in subject.get('slots', []):
            timings = slot.get('timings') or []
            if leave_day != 'None' and any(t['day'] == leave_day for t in timings):
                continue
            if not timings:
                continue
            subject_candidates.append(
                SlotCandidate(
                    subject_code=subject['code'],
                    subject_name=subject['name'],
                    slot_name=slot['slot'],
                    staff=slot.get('staff', 'Staff TBA'),
                    timings=timings,
                )
            )
        if not subject_candidates:
            raise OptimizationError(f'No valid slots remain for {subject["name"]} after applying leave-day constraints.')
        candidates_by_subject.append(sorted(subject_candidates, key=lambda candidate: candidate_score(candidate, preferred_staff, preferred_slots, avoid_time_slots), reverse=True))

    candidates_by_subject.sort(key=len)

    best_solution = {'score': float('-inf'), 'assignment': None}
    compromises = set()

    def backtrack(index: int, current_assignment: List[SlotCandidate], occupied: Dict[tuple, SlotCandidate]):
        if index == len(candidates_by_subject):
            score, compromise_notes = evaluate_solution(current_assignment, preferred_staff, preferred_slots, avoid_time_slots)
            if score > best_solution['score']:
                best_solution['score'] = score
                best_solution['assignment'] = list(current_assignment)
                compromises.clear()
                compromises.update(compromise_notes)
            return

        for candidate in candidates_by_subject[index]:
            if has_conflict(candidate, occupied):
                continue
            for timing in candidate.timings:
                occupied[(timing['day'], to_display_slot(timing['start'], timing['end']))] = candidate
            current_assignment.append(candidate)
            backtrack(index + 1, current_assignment, occupied)
            current_assignment.pop()
            for timing in candidate.timings:
                occupied.pop((timing['day'], to_display_slot(timing['start'], timing['end'])), None)

    backtrack(0, [], {})

    if not best_solution['assignment']:
        raise OptimizationError('Unable to generate a conflict-free timetable with the selected constraints.')

    selected_slots = []
    weekly = {day: {slot: '❌ LEAVE' if day == leave_day and leave_day != 'None' else None for slot in DISPLAY_SLOTS} for day in DAYS}
    for candidate in best_solution['assignment']:
        first_timing = candidate.timings[0]
        selected_slots.append(
            {
                'subject_name': candidate.subject_name,
                'subject_code': candidate.subject_code,
                'slot_name': candidate.slot_name,
                'staff': candidate.staff,
                'primary_day': first_timing['day'],
                'primary_time': to_display_slot(first_timing['start'], first_timing['end']),
            }
        )
        for timing in candidate.timings:
            display_slot = to_display_slot(timing['start'], timing['end'])
            weekly[timing['day']][display_slot] = f'{candidate.subject_name} ({candidate.subject_code})'

    summary = {
        'leave_day_status': 'No leave day requested' if leave_day == 'None' else f'{leave_day} kept fully free',
        'compromises': sorted(compromises),
        'why_optimal': build_optimality_summary(best_solution['assignment'], leave_day, avoid_time_slots, preferred_staff, preferred_slots),
    }

    return {
        'selected_slots': selected_slots,
        'weekly_timetable': weekly,
        'summary': summary,
    }


def candidate_score(candidate: SlotCandidate, preferred_staff: dict, preferred_slots: dict, avoid_time_slots: set) -> int:
    score = 0
    code = candidate.subject_code.upper()
    if preferred_staff.get(code) and preferred_staff[code].lower() == candidate.staff.lower():
        score += 18
    if preferred_slots.get(code) and preferred_slots[code] == candidate.slot_name.upper():
        score += 16
    for timing in candidate.timings:
        if to_display_slot(timing['start'], timing['end']) in avoid_time_slots:
            score -= 10
    unique_days = len({timing['day'] for timing in candidate.timings})
    score += unique_days * 2
    return score


def has_conflict(candidate: SlotCandidate, occupied: Dict[tuple, SlotCandidate]) -> bool:
    for timing in candidate.timings:
        display_slot = to_display_slot(timing['start'], timing['end'])
        if (timing['day'], display_slot) in occupied:
            return True
    return False


def evaluate_solution(assignment: List[SlotCandidate], preferred_staff: dict, preferred_slots: dict, avoid_time_slots: set) -> tuple[int, set]:
    score = 0
    compromise_notes = set()
    day_loads = defaultdict(int)

    for candidate in assignment:
        code = candidate.subject_code.upper()
        if preferred_staff.get(code):
            if preferred_staff[code].lower() == candidate.staff.lower():
                score += 20
            else:
                compromise_notes.add(f'Preferred staff not available for {candidate.subject_name}')
        if preferred_slots.get(code):
            if preferred_slots[code] == candidate.slot_name.upper():
                score += 18
            else:
                compromise_notes.add(f'Preferred slot not used for {candidate.subject_name}')

        for timing in candidate.timings:
            display_slot = to_display_slot(timing['start'], timing['end'])
            day_loads[timing['day']] += 1
            if display_slot in avoid_time_slots:
                score -= 12
                compromise_notes.add(f'Avoided slot {display_slot} used for {candidate.subject_name}')
            else:
                score += 4

    if day_loads:
        max_load = max(day_loads.values())
        min_load = min(day_loads.values())
        score -= (max_load - min_load) * 3

    return score, compromise_notes


def build_optimality_summary(assignment: List[SlotCandidate], leave_day: str, avoid_time_slots: set, preferred_staff: dict, preferred_slots: dict) -> str:
    parts = ['Conflict-free slot combination selected']
    if leave_day != 'None':
        parts.append(f'{leave_day} kept free')
    if avoid_time_slots:
        parts.append('unwanted time slots minimized')
    if preferred_staff or preferred_slots:
        parts.append('preferred staff and slot requests prioritized')
    parts.append('day distribution balanced to reduce long idle gaps')
    return ', '.join(parts) + '.'


def dedupe_timings(timings: List[dict]) -> List[dict]:
    seen = set()
    unique = []
    for timing in timings:
        key = (timing['day'], timing['start'], timing['end'])
        if key in seen:
            continue
        seen.add(key)
        unique.append(timing)
    return sorted(unique, key=lambda item: (DAYS.index(item['day']), item['start']))


def normalize_day(day: str) -> str:
    day_lower = str(day).strip().lower()
    for known_day in DAYS:
        if day_lower == known_day.lower():
            return known_day
    return ''


def normalize_time(value: str) -> str:
    value = str(value).strip().replace('.', ':')
    match = re.search(r'(\d{1,2})(?::?(\d{2}))?', value)
    if not match:
        return ''
    hours = int(match.group(1))
    minutes = int(match.group(2) or '00')
    if hours <= 7:
        hours += 12
    return f'{hours:02d}:{minutes:02d}'


def normalize_display_slot(slot: str) -> str:
    slot = str(slot).strip().replace(' ', '').replace('–', '-')
    return NORMALIZED_SLOT_MAP.get(slot, '')


def display_slot_to_times(slot: str) -> tuple[str, str]:
    mapping = {
        '8–10': ('08:00', '10:00'),
        '10–12': ('10:00', '12:00'),
        '1–3': ('13:00', '15:00'),
        '3–5': ('15:00', '17:00'),
    }
    return mapping[slot]


def to_display_slot(start: str, end: str) -> str:
    normalized = f'{start[:2].lstrip("0") or "0"}-{end[:2].lstrip("0") or "0"}'
    mapping = {
        '8-10': '8–10',
        '10-12': '10–12',
        '13-15': '1–3',
        '15-17': '3–5',
        '1-3': '1–3',
        '3-5': '3–5',
    }
    return mapping.get(normalized, NORMALIZED_SLOT_MAP.get(normalized, '10–12'))


def get_setting(name: str, default=''):
    try:
        return getattr(settings, name, default)
    except ImproperlyConfigured:
        return os.getenv(name, default)
