/**
 * Timetable Generation Algorithm — Backtracking CSP Solver
 */

/**
 * Generates a conflict-free timetable using backtracking with forward checking
 * @param {Object} config - Configuration object
 * @param {Array} config.subjects - [{name, hoursPerWeek, teacher}]
 * @param {Array} config.rooms - ['Room 101', 'Room 102', ...]
 * @param {Array} config.days - ['Monday', 'Tuesday', ...]
 * @param {number} config.periodsPerDay - Number of periods per day
 * @param {Array} config.blockedSlots - [{day, period}]
 * @param {Object} config.teacherAvailability - {teacherName: [{day, period}]} blocked
 * @returns {Object|null} Generated timetable grid or null if impossible
 */
export function generateTimetable(config) {
  const {
    subjects,
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    periodsPerDay = 8,
    blockedSlots = [],
    teacherAvailability = {},
  } = config;

  // Build assignment list: each subject needs N slots per week
  const assignments = [];
  for (const subject of subjects) {
    for (let i = 0; i < (subject.hoursPerWeek || 4); i++) {
      assignments.push({ ...subject, assignmentIndex: i });
    }
  }

  // Initialize empty grid: grid[day][period] = null
  const grid = {};
  for (const day of days) {
    grid[day] = {};
    for (let p = 1; p <= periodsPerDay; p++) {
      grid[day][p] = null;
    }
  }

  // Check if a slot is blocked
  function isBlocked(day, period) {
    return blockedSlots.some(s => s.day === day && s.period === period);
  }

  // Check teacher availability
  function isTeacherBusy(teacher, day, period) {
    // Check if teacher has a blocked slot
    const blocked = teacherAvailability[teacher] || [];
    if (blocked.some(s => s.day === day && s.period === period)) return true;

    // Check if teacher is already assigned to another subject at this time
    if (grid[day][period] && grid[day][period].teacher === teacher) return true;

    // Check across all days for same time (teacher can't be in two places)
    for (const d of days) {
      if (grid[d][period] && grid[d][period].teacher === teacher && d === day) return true;
    }

    return false;
  }

  // Check subject not already in same day too many times
  function subjectCountInDay(subjectName, day) {
    let count = 0;
    for (let p = 1; p <= periodsPerDay; p++) {
      if (grid[day][p] && grid[day][p].name === subjectName) count++;
    }
    return count;
  }

  // Backtracking solver
  function solve(index) {
    if (index >= assignments.length) return true; // All assigned

    const assignment = assignments[index];

    // Try each day and period
    for (const day of days) {
      // Limit: max 2 hours of same subject per day
      if (subjectCountInDay(assignment.name, day) >= 2) continue;

      for (let period = 1; period <= periodsPerDay; period++) {
        if (grid[day][period] !== null) continue; // Slot taken
        if (isBlocked(day, period)) continue;
        if (assignment.teacher && isTeacherBusy(assignment.teacher, day, period)) continue;

        // Assign
        grid[day][period] = {
          name: assignment.name,
          teacher: assignment.teacher || '',
        };

        if (solve(index + 1)) return true;

        // Backtrack
        grid[day][period] = null;
      }
    }

    return false; // No valid assignment found
  }

  // Shuffle assignments for randomized results
  shuffleArray(assignments);

  const success = solve(0);
  return success ? grid : null;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function exportTimetableAsText(grid, days, periodsPerDay) {
  let text = 'Timetable\n\n';
  text += 'Period\t' + days.join('\t') + '\n';
  for (let p = 1; p <= periodsPerDay; p++) {
    text += `P${p}\t`;
    text += days.map(day => {
      const cell = grid[day]?.[p];
      return cell ? cell.name : '---';
    }).join('\t');
    text += '\n';
  }
  return text;
}
