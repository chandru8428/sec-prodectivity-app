/**
 * timetable-scheduler.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardcoded CSP (Constraint Satisfaction Problem) + DFS backtracking scheduler.
 * ZERO AI involvement.  Pure deterministic logic.
 *
 * Input:
 *   selectedSubjects — array of subject objects (from regex/AI parser)
 *   preferences      — { leaveDay, avoidSlots[] }
 *
 * Output:
 *   top-3 ranked valid timetables, each with:
 *   - assignment: { subjectCode → { slot, classes[] } }
 *   - grid: { day → { time → { subject, teacher, slot } } }
 *   - score: ranking value (higher = better)
 *   - conflicts: []
 *
 * ─── SLOT ATOMICITY ──────────────────────────────────────────────────────────
 * When a slot is selected all its classes are mandatory.
 * If any class in a slot conflicts → the entire slot is rejected.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TIMES = ['8-10','10-12','1-3','3-5'];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate up to `maxResults` clash-free timetables.
 *
 * @param {Array}  selectedSubjects - Parsed subjects, each with .teachers[].slots[].classes[]
 * @param {Object} preferences      - { leaveDay: string, avoidSlots: string[] }
 * @param {number} maxResults       - How many timetables to return (default 3)
 * @returns {Array} Array of timetable result objects, sorted best-first
 */
export function generateTimetables(selectedSubjects, preferences = {}, maxResults = 3) {
  const { leaveDay = 'None', avoidSlots = [], staffPrefs = {}, slotPrefs = {} } = preferences;

  // Build a flat list of candidate "options" per subject, filtered by user prefs.
  const candidates = buildCandidates(selectedSubjects, staffPrefs, slotPrefs);

  if (candidates.length === 0) return [];

  const results = [];

  // DFS with pruning
  dfs(
    0,            // subject index
    candidates,   // all candidates
    {},           // assignment map { subjectKey → option }
    {},           // occupied: { 'day|time' → subjectKey }
    leaveDay,
    avoidSlots,
    results,
    maxResults,
  );

  // Rank and return
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults).map(r => ({
    ...r,
    grid: buildGrid(r.assignment),
  }));
}

// ── Candidate Builder ─────────────────────────────────────────────────────────

/**
 * Flatten subjects into a list of candidate lists.
 * candidatesList[i] = array of slot options for subject i.
 * Each option = { subjectKey, subject_name, subject_code, staff_name, slot_name, classes[] }
 */
function buildCandidates(subjects, staffPrefs = {}, slotPrefs = {}) {
  return subjects.map(subj => {
    const options = [];
    const key = subj.subject_code || subj.subject_name;

    // User-pinned preferences for this subject
    const pinnedStaff = staffPrefs[key] && staffPrefs[key] !== 'Any' ? staffPrefs[key] : null;
    const pinnedSlot  = slotPrefs[key]  && slotPrefs[key]  !== 'Any' ? slotPrefs[key]  : null;

    for (const teacher of (subj.teachers || [])) {
      // Filter by pinned staff if set
      if (pinnedStaff && teacher.staff_name !== pinnedStaff) continue;

      for (const slot of (teacher.slots || [])) {
        if (!slot.classes || slot.classes.length === 0) continue;
        // Filter by pinned slot if set
        if (pinnedSlot && slot.slot_name !== pinnedSlot) continue;

        options.push({
          subjectKey:   key,
          subject_name: subj.subject_name,
          subject_code: subj.subject_code,
          credits:      subj.credits,
          staff_name:   teacher.staff_name,
          slot_name:    slot.slot_name,
          classes:      slot.classes,
        });
      }
    }

    // Fallback: if pinned staff/slot produced no matches, use ALL options
    if (options.length === 0 && (pinnedStaff || pinnedSlot)) {
      for (const teacher of (subj.teachers || [])) {
        for (const slot of (teacher.slots || [])) {
          if (!slot.classes || slot.classes.length === 0) continue;
          options.push({ subjectKey:key, subject_name:subj.subject_name, subject_code:subj.subject_code, credits:subj.credits, staff_name:teacher.staff_name, slot_name:slot.slot_name, classes:slot.classes });
        }
      }
    }

    // Final fallback: TBD placeholder
    if (options.length === 0) {
      options.push({ subjectKey:key, subject_name:subj.subject_name, subject_code:subj.subject_code, credits:subj.credits, staff_name:'', slot_name:'TBD', classes:[] });
    }

    return options;
  });
}

// ── DFS Backtracking ──────────────────────────────────────────────────────────

/**
 * Recursive DFS.  Assigns one slot option to each subject in order.
 * Backtracks immediately when a conflict is detected (early pruning).
 */
function dfs(idx, candidates, assignment, occupied, leaveDay, avoidSlots, results, maxResults) {
  // All subjects assigned → record this solution
  if (idx === candidates.length) {
    const score = scoreSolution(assignment, leaveDay, avoidSlots);
    results.push({ assignment: deepClone(assignment), occupied: deepClone(occupied), score, conflicts: [] });
    return;
  }

  // Pruning: stop if we already have enough results
  if (results.length >= maxResults * 4) return;   // collect 4x then trim to maxResults after ranking

  const options = candidates[idx];

  for (const option of options) {
    // Check slot atomicity: ALL classes in this option must be free
    if (hasConflict(option.classes, occupied, leaveDay)) continue;

    // Assign this option
    const added = [];
    for (const cls of option.classes) {
      const k = `${cls.day}|${cls.time}`;
      occupied[k] = option.subjectKey;
      added.push(k);
    }
    assignment[option.subjectKey] = option;

    // Recurse to next subject
    dfs(idx + 1, candidates, assignment, occupied, leaveDay, avoidSlots, results, maxResults);

    // Unassign (backtrack)
    delete assignment[option.subjectKey];
    for (const k of added) delete occupied[k];
  }
}

// ── Conflict Checker ──────────────────────────────────────────────────────────

/**
 * Returns true if ANY class in the proposed option conflicts with
 * already-occupied slots OR falls on the leave day.
 */
function hasConflict(classes, occupied, leaveDay) {
  for (const cls of classes) {
    if (leaveDay !== 'None' && cls.day === leaveDay) return true;
    const k = `${cls.day}|${cls.time}`;
    if (occupied[k]) return true;
  }
  return false;
}

// ── Solution Scorer ───────────────────────────────────────────────────────────

/**
 * Score a complete assignment.  Higher = better.
 *
 * Criteria (in priority order):
 *  1. Zero conflicts (mandatory — guaranteed by DFS)
 *  2. Fewer avoid-slot violations
 *  3. More subjects scheduled (all slots have real classes)
 *  4. More compact schedule (classes grouped tightly, fewer gaps)
 *  5. Fewer total distinct days used (more free days)
 */
function scoreSolution(assignment, leaveDay, avoidSlots) {
  let score = 1000; // base

  for (const key of Object.keys(assignment)) {
    const opt = assignment[key];

    for (const cls of (opt.classes || [])) {
      // Penalty: class on avoid slot
      if (avoidSlots.includes(cls.time)) score -= 15;

      // Penalty: class on leave day (should not happen due to DFS guard, but just in case)
      if (leaveDay !== 'None' && cls.day === leaveDay) score -= 100;
    }

    // Bonus: slot has real class data (not TBD)
    if (opt.slot_name && opt.slot_name !== 'TBD' && opt.classes.length > 0) score += 10;

    // Bonus: teacher name is known
    if (opt.staff_name) score += 5;
  }

  // Compactness: reward schedules that concentrate classes on fewer days
  const daysUsed = new Set();
  for (const key of Object.keys(assignment)) {
    for (const cls of (assignment[key].classes || [])) {
      daysUsed.add(cls.day);
    }
  }
  // Fewer days used = more compact (up to a bonus of 30 pts)
  score += Math.max(0, 30 - daysUsed.size * 5);

  return score;
}

// ── Grid Builder ──────────────────────────────────────────────────────────────

/**
 * Convert assignment map → weekly grid:
 * { Monday: { '8-10': { subject_name, subject_code, staff_name, slot_name } } }
 */
function buildGrid(assignment) {
  const grid = {};

  for (const day of DAYS) {
    grid[day] = {};
    for (const time of TIMES) {
      grid[day][time] = null;
    }
  }

  for (const key of Object.keys(assignment)) {
    const opt = assignment[key];
    for (const cls of (opt.classes || [])) {
      if (grid[cls.day] !== undefined && TIMES.includes(cls.time)) {
        grid[cls.day][cls.time] = {
          subject_name: opt.subject_name,
          subject_code: opt.subject_code,
          staff_name:   opt.staff_name,
          slot_name:    opt.slot_name,
        };
      }
    }
  }

  return grid;
}

// ── Conflict Detector (for display) ──────────────────────────────────────────

/**
 * Given a grid, find and return all conflict descriptions.
 * Used for UI display even though DFS guarantees no conflicts.
 */
export function detectConflicts(grid) {
  const conflicts = [];
  for (const day of DAYS) {
    for (const time of TIMES) {
      const cell = grid?.[day]?.[time];
      if (Array.isArray(cell) && cell.length > 1) {
        conflicts.push(`${day} ${time}: ${cell.map(c => c.subject_name).join(' vs ')}`);
      }
    }
  }
  return conflicts;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
