/**
 * Dashboard Page - Dynamic Academic Analysis
 */
import { daysUntil, getCountdownBadge, getAttendanceColor, formatDate } from '../utils/helpers.js';
import { getExams, getFilteredExamsForStudent } from '../services/firestore-service.js';

// Demo data for non-exam sections
const demoStats = {
  gpa: '8.52',
  attendance: '87%',
  pendingLabs: 2,
};

const demoAttendance = [
  { subjectName: 'Engineering Mathematics IV', attended: 38, total: 42 },
  { subjectName: 'Operating Systems', attended: 35, total: 40 },
  { subjectName: 'Computer Networks', attended: 30, total: 38 },
  { subjectName: 'Database Management Systems', attended: 33, total: 36 },
  { subjectName: 'Software Engineering', attended: 28, total: 34 },
  { subjectName: 'Data Structures Lab', attended: 18, total: 20 },
];

export default async function renderDashboard(container) {
  const user = window.__currentUser;
  const isAdmin = user?.role === 'admin' || user?.uid === '212224220017';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const firstName = displayName.split(' ')[0];
  const regNo = (user?.regNo || user?.uid || '').toLowerCase();

  // Show loading state for data fetch
  container.innerHTML = `
    <div class="loader-container" style="display:flex; justify-content:center; align-items:center; height:300px;">
      <div class="loader"></div>
    </div>
  `;

  let filteredExams = [];
  try {
    if (isAdmin) {
      filteredExams = await getExams();
    } else {
      filteredExams = await getFilteredExamsForStudent(regNo);
    }
  } catch(e) {
    console.error('Dashboard exam load failed', e);
  }

  const now = new Date();
  const upcomingExams = filteredExams.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const finishedExams = filteredExams.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = `
    <div class="animate-fade">
      <!-- Welcome -->
      <div class="dashboard-welcome">
        <h1>Welcome back, <span>${firstName}</span></h1>
        <p>User Identity: <span class="badge badge-neutral">${regNo.toUpperCase()}</span></p>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid stagger-children">
        <div class="stat-card">
          <div class="stat-icon icon-gold">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div class="stat-value">${demoStats.gpa}</div>
          <div class="stat-label">Current GPA</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-value">${demoStats.attendance}</div>
          <div class="stat-label">Overall Attendance</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.25V14"/><circle cx="16" cy="16" r="6"/></svg>
          </div>
          <div class="stat-value">${upcomingExams.length}</div>
          <div class="stat-label">Upcoming Exams</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-info">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </div>
          <div class="stat-value">${finishedExams.length}</div>
          <div class="stat-label">Exams Finished</div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="dashboard-grid">
        <!-- Upcoming Exams -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Academic Analysis (Exams)</h2>
            <a href="#/exam-timetable" class="btn btn-ghost btn-sm">Manage →</a>
          </div>
          <div class="exam-timeline stagger-children">
            ${upcomingExams.length > 0 ? upcomingExams.map(exam => {
              const days = daysUntil(exam.date);
              const badge = getCountdownBadge(days);
              const examDate = new Date(exam.date);
              return `
                <div class="exam-timeline-item">
                  <div class="exam-date-badge" style="background: var(--surface-container-highest);">
                    <span class="date-day">${examDate.getDate()}</span>
                    <span class="date-month">${examDate.toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div class="exam-timeline-info">
                    <div class="exam-subject">${exam.subjectName}</div>
                    <div class="exam-time">${exam.time} · ${exam.venue}</div>
                  </div>
                  <span class="badge ${badge.class}">${badge.text}</span>
                </div>
              `;
            }).join('') : `
              <div class="empty-state" style="padding: 20px; text-align: center; color: var(--outline);">
                No upcoming exams scheduled for you.
              </div>
            `}

            ${finishedExams.length > 0 ? `
              <div style="margin-top: 24px;">
                <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--outline); text-transform: uppercase; letter-spacing: 0.05em;">Recently Finished</h3>
                ${finishedExams.slice(0, 3).map(exam => `
                  <div class="exam-timeline-item" style="opacity: 0.6; filter: grayscale(0.5);">
                    <div class="exam-timeline-info">
                      <div class="exam-subject">${exam.subjectName}</div>
                      <div class="exam-time">${formatDate(exam.date)} · Completed</div>
                    </div>
                    <span class="badge badge-neutral">Finished</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Attendance Overview -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Attendance Overview</h2>
            <a href="#/attendance" class="btn btn-ghost btn-sm">Details →</a>
          </div>
          <div class="attendance-mini-list stagger-children">
            ${demoAttendance.map(sub => {
              const pct = Math.round((sub.attended / sub.total) * 100);
              const color = getAttendanceColor(pct);
              return `
                <div class="attendance-mini-item">
                  <span class="subject-name">${sub.subjectName}</span>
                  <div class="progress-bar">
                    <div class="progress-bar-fill ${color}" style="width: ${pct}%"></div>
                  </div>
                  <span class="attendance-percent" style="color: var(--${color})">${pct}%</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="section" style="margin-top: var(--space-xl);">
        <h2 class="section-title" style="margin-bottom: var(--space-lg);">Quick Actions</h2>
        <div class="quick-actions stagger-children">
          <a href="#/gpa-calculator" class="quick-action-btn">
            <div class="action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.25V14"/><circle cx="16" cy="16" r="6"/></svg>
            </div>
            <span class="action-label">Calculate GPA</span>
          </a>
          <a href="#/timetable-maker" class="quick-action-btn">
            <div class="action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </div>
            <span class="action-label">Make Timetable</span>
          </a>
          <a href="#/qna-board" class="quick-action-btn">
            <div class="action-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span class="action-label">Ask a Question</span>
          </a>
        </div>
      </div>
    </div>
  `;
}
