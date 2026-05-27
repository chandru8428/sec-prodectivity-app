/**
 * timetable-regex-parser.js  — v3
 * Tuned exactly for the college exam preview PDF format.
 *
 * FORMAT:
 *   19ME533 [4 Credits]
 *   Enrolled / OPEN ELECTIVE - OPEN ELECTIVE / Course overview / Full / etc.  ← noise
 *   3D Printing Processes                       ← subject name
 *   Full / Not Enrolled / No. of attempts: 0   ← noise
 *   UG - 08, T2-N2, MECH - Sellakumar S        ← slot + teacher
 *   Date: 16-04-2026 to 06-06-2026             ← noise
 *   Friday: 13:00 - 14:0014:00 - 15:00         ← day + time (concatenated)
 *   Monday: 13:00 - 14:0014:00 - 15:00
 *   UG - 08, T2-H9, MECH - CALEB DANIEL R      ← next slot/teacher
 *
 * TIME MAP: 08→"8-10"  10→"10-12"  13→"1-3"  15→"3-5"
 */

// ── Noise patterns ────────────────────────────────────────────────────────────
// ALL-CAPS "CATEGORY - CATEGORY" lines use a generic regex so we catch everything:
// "OPEN ELECTIVE - OPEN ELECTIVE", "ENGINEERING SCIENCES - ENGINEERING SCIENCES",
// "PROFESSIONAL CORE - PROFESSIONAL CORE PC", "HUMANITIES AND SCIENCES - ..."
const NOISE_PATTERNS = [
  /^Enrolled\s*$/i,
  /^Not Enrolled\s*$/i,
  /^Full\s*$/i,
  /^Course overview\s*$/i,
  /^Type a subject name/i,
  /^No\. of attempts/i,
  /^Date:\s*\d/i,
  // Generic: ALL-CAPS words separated by " - " (category header lines)
  /^[A-Z][A-Z\s]{3,}\s+-\s+[A-Z][A-Z\s]{3,}.*$/,
];
function isNoise(line) {
  return NOISE_PATTERNS.some(re => re.test(line.trim()));
}

// ── Regexes ───────────────────────────────────────────────────────────────────
// Header: "19ME533 [4 Credits]" or "19AI553 [3 Credits]"
const RE_HEADER = /^([A-Z0-9]{4,10})\s+\[(\d+)\s+Credits?\]/i;

// Slot/teacher: "UG - 08, T2-N2, MECH - Sellakumar S"
// Slot codes: T2-N2, T2-H9, T2-BLENDED-4, T2-BLENDED, T2-Q10 etc.
const RE_SLOT_LINE = /^UG\s*-\s*\d+,\s*([A-Z0-9][A-Z0-9]*(?:-[A-Z0-9]+)*),\s*[A-Z]+\s*-\s*(.+?)\s*$/i;

// Day line (matches BOTH concatenated and split time formats):
// "Friday: 13:00 - 14:0014:00 - 15:00"  → captures start "13:00"
// "Friday: 13:00 - 15:00"               → captures start "13:00"
const RE_DAY_LINE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*(\d{2}:\d{2})/i;

// ── Time mapping ──────────────────────────────────────────────────────────────
function startHourToSlot(hhmm) {
  const h = parseInt(hhmm.split(':')[0], 10);
  if (h === 8)  return '8-10';
  if (h === 10) return '10-12';
  if (h === 13) return '1-3';
  if (h === 15) return '3-5';
  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseText(rawText) {
  if (!rawText) return { subjects: [], confidence: 0 };

  // Fix concatenated times: "13:00 - 14:0014:00" → "13:00 - 14:00"
  const text = rawText.replace(
    /(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/g, '$1'
  );

  const lines = text.split('\n').map(l => l.trim());
  const subjects = [];
  let i = 0;

  while (i < lines.length) {
    const hm = lines[i].match(RE_HEADER);
    if (!hm) { i++; continue; }

    const code    = hm[1].toUpperCase();
    const credits = parseInt(hm[2], 10);
    i++;

    // ── Find subject name ──────────────────────────────────────────────────
    // Subject name = first non-noise line before the first "UG -" slot line
    let subjectName = '';
    const preLines = [];
    while (i < lines.length && !RE_SLOT_LINE.test(lines[i]) && !RE_HEADER.test(lines[i])) {
      preLines.push(lines[i]);
      i++;
    }
    for (const pl of preLines) {
      const trimmed = pl.trim();
      if (!trimmed) continue;
      if (isNoise(trimmed)) continue;
      // Must contain at least 2 consecutive letters (real words)
      if (/[A-Za-z]{2}/.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 120) {
        subjectName = trimmed;
        break;
      }
    }

    const subject = { subject_name: subjectName, subject_code: code, credits, parser: 'regex', confidence: 0, teachers: [] };

    // ── Parse teachers + slots ─────────────────────────────────────────────
    while (i < lines.length && !RE_HEADER.test(lines[i])) {
      const line = lines[i];
      if (!line || isNoise(line)) { i++; continue; }

      const sm = line.match(RE_SLOT_LINE);
      if (sm) {
        const slotName    = sm[1].toUpperCase().trim();
        const teacherName = sm[2].trim();
        i++;

        let teacher = subject.teachers.find(t => t.staff_name === teacherName);
        if (!teacher) { teacher = { staff_name: teacherName, slots: [] }; subject.teachers.push(teacher); }

        const slot = { slot_name: slotName, classes: [] };
        teacher.slots.push(slot);

        // Collect day+time lines belonging to this slot
        while (i < lines.length && !RE_SLOT_LINE.test(lines[i]) && !RE_HEADER.test(lines[i])) {
          const inner = lines[i].trim();
          if (inner && !isNoise(inner)) {
            const dm = inner.match(RE_DAY_LINE);
            if (dm) {
              const day = dm[1].charAt(0).toUpperCase() + dm[1].slice(1).toLowerCase();
              const canonical = startHourToSlot(dm[2]);
              if (canonical && !slot.classes.find(c => c.day === day && c.time === canonical)) {
                slot.classes.push({ day, time: canonical });
              }
            }
          }
          i++;
        }
        continue;
      }
      i++;
    }

    if (subjectName || code) {
      subject.confidence = scoreSubject(subject);
      subjects.push(subject);
    }
  }

  const confidence = subjects.length > 0
    ? Math.round(subjects.reduce((s, x) => s + x.confidence, 0) / subjects.length)
    : 0;

  return { subjects, confidence };
}

function scoreSubject(s) {
  let sc = 0;
  if (s.subject_name?.length >= 3) sc += 25;
  if (/^[A-Z0-9]{4,}/.test(s.subject_code)) sc += 25;
  if (s.teachers?.length > 0) sc += 25;
  if (s.teachers?.some(t => t.slots?.some(sl => sl.classes?.length > 0))) sc += 25;
  return sc;
}
