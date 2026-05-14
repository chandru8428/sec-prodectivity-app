import './styles/design-system.css';
import './styles/pages.css';
import './styles/theme-overrides.css';
import './styles/responsive-mobile.css';
import { auth, db, onAuthStateChanged, doc, getDoc } from '/src/firebase.js';
import { router } from './router.js';

// ── Toast System ──────────────────────────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

export function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 300ms ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── App State ─────────────────────────────────────────────────────────────────
export const appState = {
  currentUser: null,
  userRole: null,
  userData: null,
  isLoading: true,
};

// ── Auth Guard ────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  appState.isLoading = true;

  if (user) {
    appState.currentUser = user;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        appState.userData  = userDoc.data();
        appState.userRole  = userDoc.data().role;
      } else {
        // Admin check by email
        if (user.email === 'admin@example.com') {
          appState.userRole  = 'admin';
          appState.userData  = { name: 'Admin', email: user.email, role: 'admin', registerNumber: 'ADMIN001' };
        } else {
          appState.userRole  = 'student';
          appState.userData  = { name: user.displayName || user.email, email: user.email, role: 'student' };
        }
      }
    } catch (err) {
      console.warn('Firestore read failed:', err);
      appState.userRole = 'student';
      appState.userData = { name: user.displayName || 'Student', email: user.email, role: 'student' };
    }

    // Route to appropriate dashboard
    const currentHash = window.location.hash;
    if (!currentHash || currentHash === '#/' || currentHash === '#/login') {
      router.navigate(appState.userRole === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } else {
      router.render();
    }
  } else {
    appState.currentUser = null;
    appState.userRole    = null;
    appState.userData    = null;
    router.navigate('/login');
  }

  appState.isLoading = false;
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <div id="page-root"></div>
`;

// Fallback: if auth bootstrap stalls, still show the login route instead of a blank shell.
setTimeout(() => {
  const root = document.getElementById('page-root');
  if (appState.isLoading && root && !root.innerHTML.trim()) {
    appState.isLoading = false;
    router.navigate('/login');
  }
}, 1500);
