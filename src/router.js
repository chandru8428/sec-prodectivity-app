import { appState } from './main.js';

// ── Route Definitions ─────────────────────────────────────────────────────────
const routes = {
  '/login':               () => import('./pages/login.js'),
  '/register':            () => import('./pages/register.js'),
  '/student/dashboard':   () => import('./pages/student/dashboard.js'),
  '/student/timetable':   () => import('./pages/student/timetable.js'),
  '/student/timetable-maker': () => import('./pages/student/timetable-maker.js'),
  '/student/gpa':         () => import('./pages/student/gpa.js'),
  '/student/qa-board':    () => import('./pages/student/qa-board.js'),
  '/student/record-book': () => import('./pages/student/record-book.js'),
  '/student/attendance':  () => import('./pages/student/attendance.js'),
  '/admin/dashboard':     () => import('./pages/admin/dashboard.js'),
  '/admin/upload-timetable': () => import('./pages/admin/upload-timetable.js'),
  '/admin/repo-mapping':  () => import('./pages/admin/repo-mapping.js'),
  '/admin/moderation':    () => import('./pages/admin/moderation.js'),
  '/admin/calendar':      () => import('./pages/admin/calendar.js'),
  '/admin/students':      () => import('./pages/admin/students.js'),
};

// ── Auth-Protected Route Map ───────────────────────────────────────────────────
const studentRoutes = new Set([
  '/student/dashboard', '/student/timetable', '/student/timetable-maker',
  '/student/gpa', '/student/qa-board', '/student/record-book', '/student/attendance',
]);
const adminRoutes = new Set([
  '/admin/dashboard', '/admin/upload-timetable', '/admin/repo-mapping',
  '/admin/moderation', '/admin/calendar', '/admin/students',
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
      if (!appState.currentUser) { this.navigate('/login'); return; }
      if (appState.userRole === 'admin') { this.navigate('/admin/dashboard'); return; }
    }

    if (adminRoutes.has(path) && appState.userRole !== 'admin') {
      if (!appState.currentUser) { this.navigate('/login'); return; }
      if (appState.userRole === 'student') { this.navigate('/student/dashboard'); return; }
    }

    const loader = routes[path];
    if (!loader) { this.navigate('/login'); return; }

    const root = document.getElementById('page-root');
    if (!root) return;

    try {
      const module = await loader();
      root.innerHTML = '';
      module.render(root);
    } catch (err) {
      console.error('Route render error:', err);
      root.innerHTML = `<div style="padding:2rem;color:#f87171">Failed to load page: ${err.message}</div>`;
    }
  }
};

// ── Hash Change Listener ───────────────────────────────────────────────────────
window.addEventListener('hashchange', () => {
  if (!appState.isLoading) router.render();
});
