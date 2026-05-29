import { appState } from './main.js';

// ── Route Definitions ─────────────────────────────────────────────────────────
const routes = {
  '/login':               () => import('../features/auth/LoginPage.js'),
  '/register':            () => import('../features/auth/RegisterPage.js'),
  '/forgot-password':     () => import('../features/auth/ForgotPasswordPage.js'),
  '/student/dashboard':   () => import('../features/dashboard/StudentDashboard.js'),
  '/student/timetable':   () => import('../features/timetable/ExamTimetable.js'),
  '/student/timetable-maker': () => import('../features/timetable/TimetableMaker.js'),
  '/student/gpa':         () => import('../features/gpa/GpaCalculator.js'),
  '/student/qa-board':    () => import('../features/qa-board/QaBoard.js'),
  '/student/record-book': () => import('../features/record-book/RecordBook.js'),
  '/student/attendance':  () => import('../features/attendance/AttendanceTracker.js'),
  '/admin/dashboard':     () => import('../features/dashboard/AdminDashboard.js'),
  '/admin/upload-timetable': () => import('../features/timetable/UploadTimetable.js'),
  '/admin/repo-mapping':  () => import('../features/repo-mapping/RepoMapping.js'),
  '/admin/moderation':    () => import('../features/qa-board/QaModeration.js'),
  '/admin/calendar':      () => import('../features/calendar/AcademicCalendar.js'),
  '/admin/students':      () => import('../features/students/StudentList.js'),
  '/admin/announcements': () => import('../features/announcements/AdminAnnouncements.js'),
  '/student/profile':     () => import('../features/profile/ProfilePage.js'),
};

const PAGE_TITLES = {
  '/login':                   'Login | EduSync',
  '/register':                'Create Account | EduSync',
  '/forgot-password':         'Reset Password | EduSync',
  '/student/dashboard':       'Dashboard | EduSync',
  '/student/timetable':       'Exam Roadmap | EduSync',
  '/student/timetable-maker': 'AI Schedule Crafter | EduSync',
  '/student/gpa':             'GPA Calculator | EduSync',
  '/student/qa-board':        'Knowledge Exchange | EduSync',
  '/student/record-book':     'Record Book Forge | EduSync',
  '/student/attendance':      'Attendance Tracker | EduSync',
  '/student/profile':         'My Profile | EduSync',
  '/admin/dashboard':         'Admin Dashboard | EduSync',
  '/admin/upload-timetable':  'Upload Timetable | EduSync',
  '/admin/repo-mapping':      'Repo Mapping | EduSync',
  '/admin/moderation':        'Q&A Moderation | EduSync',
  '/admin/calendar':          'Academic Calendar | EduSync',
  '/admin/students':          'All Students | EduSync',
  '/admin/announcements':     'Announcements | EduSync',
};

// ── Auth-Protected Route Map ───────────────────────────────────────────────────
const studentRoutes = new Set([
  '/student/dashboard', '/student/timetable', '/student/timetable-maker',
  '/student/gpa', '/student/qa-board', '/student/record-book', '/student/attendance',
  '/student/profile',
]);
const adminRoutes = new Set([
  '/admin/dashboard', '/admin/upload-timetable', '/admin/repo-mapping',
  '/admin/moderation', '/admin/calendar', '/admin/students', '/admin/announcements',
]);

// ── Router ────────────────────────────────────────────────────────────────────
export const router = {
  currentPath: '/login',

  navigate(path) {
    window.location.hash = '#' + path;
    this.currentPath = path;
    this.render();
  },

  getCurrentPath() {
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#/') return '/login';
    return hash.replace(/^#/, '') || '/login';
  },

  async render() {
    const path = this.getCurrentPath();
    this.currentPath = path;

    // Auth guards
    if (studentRoutes.has(path) && appState.userRole !== 'student') {
      if (!appState.currentUser) {
        sessionStorage.setItem('edusync_redirect', path);
        this._showSessionToast();
        this.navigate('/login');
        return;
      }
      if (appState.userRole === 'admin') { this.navigate('/admin/dashboard'); return; }
      this.navigate('/register'); return;
    }

    if (adminRoutes.has(path) && appState.userRole !== 'admin') {
      if (!appState.currentUser) {
        sessionStorage.setItem('edusync_redirect', path);
        this._showSessionToast();
        this.navigate('/login');
        return;
      }
      if (appState.userRole === 'student') { this.navigate('/student/dashboard'); return; }
      this.navigate('/register'); return;
    }

    const loader = routes[path];
    if (!loader) { this.navigate('/login'); return; }

    const root = document.getElementById('page-root');
    if (!root) return;

    // Update document title dynamically
    document.title = PAGE_TITLES[path] || 'EduSync — Your Academic Command Center';

    try {
      const module = await loader();
      root.innerHTML = '';
      module.render(root);
    } catch (err) {
      console.error('Route render error:', err);
      root.innerHTML = `<div style="padding:2rem;color:#f87171">Failed to load page: ${err.message}</div>`;
    }
  },

  /** Show a brief toast when session-guard redirects to login */
  _showSessionToast() {
    const existing = document.querySelector('.session-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'session-toast';
    toast.textContent = 'Session expired — please sign in again';
    toast.style.cssText = `
      position:fixed;top:16px;left:50%;transform:translateX(-50%);
      background:var(--bg-card,#1e1e2e);color:var(--color-on-surface,#fff);
      padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;
      box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:10000;
      animation:slideDown 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  /** After login, consume saved redirect path if any */
  consumeRedirect(fallback) {
    const saved = sessionStorage.getItem('edusync_redirect');
    sessionStorage.removeItem('edusync_redirect');
    return saved || fallback;
  }
};
window.addEventListener('hashchange', () => {
  if (!appState.isLoading) router.render();
});
