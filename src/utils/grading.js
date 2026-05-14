/**
 * Anna University Grading System Utilities
 */

// Official Anna University grade mapping
export const gradeTable = [
  { grade: 'O',  minMarks: 91, maxMarks: 100, points: 10, label: 'Outstanding' },
  { grade: 'A+', minMarks: 81, maxMarks: 90,  points: 9,  label: 'Excellent' },
  { grade: 'A',  minMarks: 71, maxMarks: 80,  points: 8,  label: 'Very Good' },
  { grade: 'B+', minMarks: 61, maxMarks: 70,  points: 7,  label: 'Good' },
  { grade: 'B',  minMarks: 56, maxMarks: 60,  points: 6,  label: 'Average' },
  { grade: 'C',  minMarks: 50, maxMarks: 55,  points: 5,  label: 'Satisfactory' },
  { grade: 'RA', minMarks: 0,  maxMarks: 49,  points: 0,  label: 'Re-Appear' },
];

export function getGradeFromMarks(marks) {
  for (const row of gradeTable) {
    if (marks >= row.minMarks && marks <= row.maxMarks) return row;
  }
  return gradeTable[gradeTable.length - 1]; // RA default
}

export function calculateGPA(subjects) {
  let totalCredits = 0;
  let totalWeighted = 0;

  for (const sub of subjects) {
    const gradeInfo = getGradeFromMarks(sub.marks);
    totalCredits += sub.credits;
    totalWeighted += sub.credits * gradeInfo.points;
  }

  return totalCredits > 0 ? (totalWeighted / totalCredits) : 0;
}

export function calculateCGPA(semesterGPAs) {
  if (semesterGPAs.length === 0) return 0;
  const totalGPA = semesterGPAs.reduce((sum, s) => sum + s.gpa, 0);
  return totalGPA / semesterGPAs.length;
}

export function calculateTargetGPA(currentCGPA, completedSemesters, targetCGPA) {
  // Required GPA = (targetCGPA * (completedSemesters + 1)) - (currentCGPA * completedSemesters)
  const requiredGPA = (targetCGPA * (completedSemesters + 1)) - (currentCGPA * completedSemesters);
  return Math.min(Math.max(requiredGPA, 0), 10);
}

export function getMinMarksForGrade(targetGrade) {
  const entry = gradeTable.find(g => g.grade === targetGrade);
  return entry ? entry.minMarks : 0;
}

export function getGradeColor(grade) {
  const colors = {
    'O': '#4ade80',
    'A+': '#22c55e',
    'A': '#60a5fa',
    'B+': '#ba92fa',
    'B': '#fbbf24',
    'C': '#f59e0b',
    'RA': '#ff6e84',
  };
  return colors[grade] || '#adaaaa';
}
