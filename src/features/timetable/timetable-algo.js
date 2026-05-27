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

  const totalSlotsNeeded = assignments.length;
  const totalAvailableSlots = (days.length * periodsPerDay) - blockedSlots.length;
  if (totalSlotsNeeded > totalAvailableSlots) {
    return {
      success: false,
      grid: null,
      error: `Not enough total slots available. Need ${totalSlotsNeeded} but only ${totalAvailableSlots} are open.`,
      suggestion: 'Add more working days, increase periods per day, or reduce the number of hours per week for your subjects.'
    };
  }

  let maxDepthReached = -1;
  let failureReasons = null;
  let failedAssignment = null;

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
    let localReasons = { slotTaken: 0, blocked: 0, teacherBusy: 0, dailyLimit: 0, totalChecked: 0 };

    // Try each day and period
    for (const day of days) {
      // Limit: max 2 hours of same subject per day
      if (subjectCountInDay(assignment.name, day) >= 2) {
        localReasons.dailyLimit += periodsPerDay;
        localReasons.totalChecked += periodsPerDay;
        continue;
      }

      for (let period = 1; period <= periodsPerDay; period++) {
        localReasons.totalChecked++;
        if (grid[day][period] !== null) { localReasons.slotTaken++; continue; }
        if (isBlocked(day, period)) { localReasons.blocked++; continue; }
        if (assignment.teacher && isTeacherBusy(assignment.teacher, day, period)) { localReasons.teacherBusy++; continue; }

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

    if (index > maxDepthReached) {
      maxDepthReached = index;
      failureReasons = localReasons;
      failedAssignment = assignment;
    }

    return false; // No valid assignment found
  }

  // Shuffle assignments for randomized results
  shuffleArray(assignments);

  const success = solve(0);
  if (success) {
    return { success: true, grid, error: null, suggestion: null };
  } else {
    let errorMsg = `Could not place "${failedAssignment.name}" (Teacher: ${failedAssignment.teacher || 'None'}). `;
    let suggestionMsg = '';

    if (failureReasons.dailyLimit >= failureReasons.totalChecked) {
      errorMsg += `Reached the daily maximum of 2 hours for this subject on all available days. `;
      suggestionMsg = 'Try spreading the subject across more working days, or reduce its hours per week.';
    } else if (failureReasons.teacherBusy > 0 && failureReasons.teacherBusy >= (failureReasons.totalChecked - failureReasons.slotTaken - failureReasons.blocked)) {
      errorMsg += `The teacher (${failedAssignment.teacher}) is fully booked or unavailable in the remaining open slots. `;
      suggestionMsg = 'Try assigning a different teacher to some hours, or free up blocked slots.';
    } else {
      errorMsg += `The remaining slots were either occupied by other classes or explicitly blocked. `;
      suggestionMsg = 'Try adding more working days, increasing periods per day, or unblocking some slots.';
    }

    return {
      success: false,
      grid: null,
      error: errorMsg,
      suggestion: suggestionMsg,
      conflictAssignment: failedAssignment
    };
  }
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
