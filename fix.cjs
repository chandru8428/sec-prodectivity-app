const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'dashboard', 'StudentDashboard.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update filtering
const filterOld = `    const exams = rawExams
      .filter(e => e.examDate >= today)
      .sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''))
      .slice(0, 5);`;
const filterNew = `    const now = new Date();
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
content = content.replace(filterOld, filterNew);

// 2. Add formatTime12 before renderHeroExam
const renderHeroOld = `function renderHeroExam(main, exam) {`;
const renderHeroNew = `function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return \`\${hour}:\${m} \${ampm}\`;
}

function renderHeroExam(main, exam) {`;
content = content.replace(renderHeroOld, renderHeroNew);

// 3. Update 12-hour in renderHeroExam
const heroTimeOld = `\${exam.startTime ? \`<span>🕐 \${exam.startTime}</span>\` : ''}`;
const heroTimeNew = `\${exam.startTime ? \`<span>🕐 \${formatTime12(exam.startTime)}</span>\` : ''}`;
content = content.replace(heroTimeOld, heroTimeNew);

// 4. Update startCountdown for auto reload
const countdownOld = `function startCountdown(main, exam) {
  function tick() {
    const target = new Date(\`\${exam.examDate}T\${exam.startTime || '09:00'}:00\`);
    const now    = new Date();
    const diff   = target - now;

    if (diff <= 0) {`;
const countdownNew = `function startCountdown(main, exam) {
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
content = content.replace(countdownOld, countdownNew);

// 5. Update renderExamList time format
const listTimeOld = `<div class="exam-meta-item">🕐 \${exam.startTime || 'TBA'} – \${exam.endTime || 'TBA'}</div>`;
const listTimeNew = `<div class="exam-meta-item">🕐 \${exam.startTime ? formatTime12(exam.startTime) : 'TBA'} – \${exam.endTime ? formatTime12(exam.endTime) : 'TBA'}</div>`;
content = content.replace(listTimeOld, listTimeNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log("File updated successfully.");
