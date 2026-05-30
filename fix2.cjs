const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/dashboard/StudentDashboard.js');
let content = fs.readFileSync(filePath, 'utf8');

// Use a more robust regex-based replacement to handle CRLF/LF

// 1. Replace the rawExams filter & sort
const filterRegex = /const exams = rawExams\s*\.filter\(e => e\.examDate >= today\)\s*\.sort\(\(a, b\) => \(a\.examDate \|\| ''\)\.localeCompare\(b\.examDate \|\| ''\)\)\s*\.slice\(0, 5\);/g;

const filterNew = `const now = new Date();
    const exams = rawExams
      .filter(e => {
        const timeStr = e.endTime || e.startTime || '23:59';
        const examEnd = new Date(\`\${e.examDate}T\${timeStr}:00\`);
        return isNaN(examEnd) ? e.examDate >= today : examEnd > now;
      })
      .sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return \`\${a.examDate}T\${timeA}\`.localeCompare(\`\${b.examDate}T\${timeB}\`);
      })
      .slice(0, 5);`;

content = content.replace(filterRegex, filterNew);

// 2. Add formatTime12 function and replace renderHeroExam time formatting
if (!content.includes('function formatTime12')) {
  content = content.replace('function renderHeroExam(main, exam) {', `function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return \`\${hour}:\${m} \${ampm}\`;
}

function renderHeroExam(main, exam) {`);
}

content = content.replace(
  `\${exam.startTime ? \`<span>🕐 \${exam.startTime}</span>\` : ''}`,
  `\${exam.startTime ? \`<span>🕐 \${formatTime12(exam.startTime)}</span>\` : ''}`
);

// 3. Update startCountdown to check for endTarget and refresh
const startCountdownRegex = /function startCountdown\(main, exam\) \{\s*function tick\(\) \{\s*const target = new Date\(`\$\{exam\.examDate\}T\$\{exam\.startTime \|\| '09:00'\}:00`\);\s*const now    = new Date\(\);\s*const diff   = target - now;\s*if \(diff <= 0\) \{/g;

const startCountdownNew = `function startCountdown(main, exam) {
  function tick() {
    const target = new Date(\`\${exam.examDate}T\${exam.startTime || '09:00'}:00\`);
    const endTarget = new Date(\`\${exam.examDate}T\${exam.endTime || exam.startTime || '23:59'}:00\`);
    const now    = new Date();
    
    if (now >= endTarget) {
      countdownIntervals.forEach(clearInterval);
      countdownIntervals = [];
      loadDashboardData(main);
      return;
    }

    const diff   = target - now;

    if (diff <= 0) {`;

content = content.replace(startCountdownRegex, startCountdownNew);

// 4. Update renderExamList to format times correctly
content = content.replace(
  `<div class="exam-meta-item">🕐 \${exam.startTime || 'TBA'} – \${exam.endTime || 'TBA'}</div>`,
  `<div class="exam-meta-item">🕐 \${exam.startTime ? formatTime12(exam.startTime) : 'TBA'} – \${exam.endTime ? formatTime12(exam.endTime) : 'TBA'}</div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('File successfully updated.');
