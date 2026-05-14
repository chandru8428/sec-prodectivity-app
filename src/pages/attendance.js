/**
 * Tool 6: Attendance Tracker — 85% Mandate Compliance
 */
import { getAttendanceColor, safeToSkip, needToAttend } from '../utils/helpers.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { createChart } from '../components/chart.js';

const demoSubjects = [
  { id: 's1', subjectName: 'Engineering Mathematics IV', attended: 38, total: 42, logs: [] },
  { id: 's2', subjectName: 'Operating Systems', attended: 35, total: 40, logs: [] },
  { id: 's3', subjectName: 'Computer Networks', attended: 30, total: 38, logs: [] },
  { id: 's4', subjectName: 'Database Management Systems', attended: 33, total: 36, logs: [] },
  { id: 's5', subjectName: 'Software Engineering', attended: 28, total: 34, logs: [] },
  { id: 's6', subjectName: 'Data Structures Lab', attended: 18, total: 20, logs: [] },
  { id: 's7', subjectName: 'Compiler Design', attended: 25, total: 32, logs: [] },
  { id: 's8', subjectName: 'Environmental Science', attended: 22, total: 24, logs: [] },
];

export default async function renderAttendance(container) {
  let subjects = demoSubjects.map(s => ({ ...s }));
  let weeklyChart = null;

  function getOverall() {
    const totalAttended = subjects.reduce((s, sub) => s + sub.attended, 0);
    const totalClasses = subjects.reduce((s, sub) => s + sub.total, 0);
    return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  }

  function render() {
    const overall = getOverall();
    const belowThreshold = subjects.filter(s => Math.round((s.attended / s.total) * 100) < 85);
    const bestSubject = subjects.reduce((best, s) => {
      const pct = s.total > 0 ? (s.attended / s.total) * 100 : 0;
      return pct > (best.pct || 0) ? { name: s.subjectName, pct } : best;
    }, {});
    const worstSubject = subjects.reduce((worst, s) => {
      const pct = s.total > 0 ? (s.attended / s.total) * 100 : 100;
      return pct < (worst.pct || 100) ? { name: s.subjectName, pct } : worst;
    }, {});

    const overallColor = overall >= 85 ? '#4ade80' : overall >= 75 ? '#fbbf24' : '#ff6e84';
    const circumference = 2 * Math.PI * 60;
    const dashOffset = circumference - (circumference * overall / 100);

    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>Attendance Tracker</h1>
          <p class="subtitle">85% Mandate Compliance — SRM Institute</p>
        </div>

        ${belowThreshold.length > 0 ? `
          <div class="alert-banner">
            <span class="alert-icon">⚠️</span>
            <span class="alert-text">
              <strong>${belowThreshold.length} subject${belowThreshold.length > 1 ? 's' : ''}</strong> below 85% threshold:
              ${belowThreshold.map(s => s.subjectName).join(', ')}
            </span>
          </div>
        ` : ''}

        <!-- Header Row: Ring + Stats -->
        <div class="attendance-header-row">
          <div class="overall-ring">
            <div class="circular-progress" style="width:160px;height:160px;">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="60" fill="none" stroke="var(--surface-container-highest)" stroke-width="10" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="${overallColor}" stroke-width="10"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                  stroke-linecap="round" style="transition: stroke-dashoffset 1s ease;" />
              </svg>
              <span class="progress-text" style="font-size:2rem;">${overall}%</span>
            </div>
          </div>
          <div class="attendance-stats">
            <div class="stat-card">
              <div class="stat-value">${subjects.length}</div>
              <div class="stat-label">Total Subjects</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:var(--success);">${bestSubject.name?.split(' ')[0] || '-'}</div>
              <div class="stat-label">Best (${Math.round(bestSubject.pct || 0)}%)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:var(--error);">${worstSubject.name?.split(' ')[0] || '-'}</div>
              <div class="stat-label">Needs Attention (${Math.round(worstSubject.pct || 0)}%)</div>
            </div>
          </div>
        </div>

        <!-- Subject Cards -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Subject-wise Attendance</h2>
            <button class="btn btn-primary btn-sm" id="log-attendance-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Log Attendance
            </button>
          </div>
          <div class="attendance-subjects stagger-children">
            ${subjects.map(sub => {
              const pct = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 0;
              const color = getAttendanceColor(pct);
              const skip = safeToSkip(sub.attended, sub.total);
              const need = needToAttend(sub.attended, sub.total);
              return `
                <div class="subject-attendance-card">
                  <div class="subject-header">
                    <span class="subject-name">${sub.subjectName}</span>
                    <span class="subject-percent" style="color: var(--${color})">${pct}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-bar-fill ${color}" style="width: ${pct}%"></div>
                  </div>
                  <div class="classes-info">${sub.attended} / ${sub.total} classes attended</div>
                  ${pct >= 85 ? 
                    `<div class="skip-info safe">✅ Safe to skip ${skip} more class${skip !== 1 ? 'es' : ''}</div>` :
                    `<div class="skip-info danger">⚠️ Need ${need} more consecutive classes</div>`
                  }
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Weekly Trend -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Weekly Trend</h2>
          </div>
          <div class="glass-card-static">
            <div class="chart-container" style="height:250px;">
              <canvas id="weekly-trend-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Calendar -->
        <div class="section attendance-calendar">
          <div class="section-header">
            <h2 class="section-title">April 2026</h2>
          </div>
          <div class="glass-card-static">
            <div class="calendar-grid">
              ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="calendar-day header">${d}</div>`).join('')}
              ${generateCalendarDays().map(d => `<div class="calendar-day ${d.type}">${d.day || ''}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    setupEvents();
    initChart();
  }

  function generateCalendarDays() {
    const days = [];
    const firstDay = new Date(2026, 3, 1).getDay(); // April 2026
    // Empty cells
    for (let i = 0; i < firstDay; i++) days.push({ day: '', type: '' });
    // Days
    for (let d = 1; d <= 30; d++) {
      const dayOfWeek = new Date(2026, 3, d).getDay();
      if (dayOfWeek === 0) {
        days.push({ day: d, type: 'holiday' }); // Sundays
      } else if (d <= 15) {
        // Past days — random present/absent
        days.push({ day: d, type: Math.random() > 0.15 ? 'present' : 'absent' });
      } else {
        days.push({ day: d, type: '' }); // Future
      }
    }
    return days;
  }

  function initChart() {
    const canvas = document.getElementById('weekly-trend-chart');
    if (!canvas) return;
    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = createChart(canvas, 'bar', {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      datasets: [{
        label: 'Attendance %',
        data: [92, 88, 85, 90, 87, 89],
        backgroundColor: [
          'rgba(74, 222, 128, 0.6)', 'rgba(74, 222, 128, 0.6)',
          'rgba(251, 191, 36, 0.6)', 'rgba(74, 222, 128, 0.6)',
          'rgba(74, 222, 128, 0.6)', 'rgba(74, 222, 128, 0.6)',
        ],
        borderRadius: 6,
        borderSkipped: false,
      }],
    }, {
      plugins: { legend: { display: false } },
      scales: { y: { min: 60, max: 100, ticks: { callback: v => v + '%' } } },
    });
  }

  function setupEvents() {
    // Log Attendance
    document.getElementById('log-attendance-btn')?.addEventListener('click', () => {
      showModal({
        title: 'Log Attendance',
        content: `
          <div class="form-group" style="margin-bottom:16px;">
            <label>Subject</label>
            <div class="select-wrapper">
              <select id="log-subject">
                ${subjects.map((s, i) => `<option value="${i}">${s.subjectName}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Date</label>
            <input type="date" id="log-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <div class="role-toggle" style="margin-top:4px;">
              <button type="button" class="role-option active" data-status="present">✅ Present</button>
              <button type="button" class="role-option" data-status="absent">❌ Absent</button>
            </div>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="submit-log-btn">Log</button>
        `,
      });

      // Status toggle
      document.querySelectorAll('.role-option[data-status]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.role-option[data-status]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Submit
      document.getElementById('submit-log-btn')?.addEventListener('click', () => {
        const idx = parseInt(document.getElementById('log-subject')?.value);
        const present = document.querySelector('.role-option[data-status].active')?.dataset.status === 'present';

        subjects[idx].total++;
        if (present) subjects[idx].attended++;

        document.querySelector('.modal-backdrop')?.remove();
        showToast(`Attendance logged for ${subjects[idx].subjectName}`, 'success');
        render();
      });

      document.querySelector('.modal-cancel-btn')?.addEventListener('click', () => {
        document.querySelector('.modal-backdrop')?.remove();
      });
    });
  }

  render();

  return () => {
    if (weeklyChart) weeklyChart.destroy();
  };
}
