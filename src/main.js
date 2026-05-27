import './styles/design-system.css';
import './styles/pages.css';
import './styles/theme-overrides.css';
import './styles/responsive-mobile.css';
import { auth, db, onAuthStateChanged, doc, getDoc } from '/src/firebase.js';
import { supabase } from '/src/supabase.js';

import { router } from './router.js';

// ── Theme Toggle Logic ────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.body.classList.add('dark-mode');
} else {
  document.body.classList.add('light-mode');
}

const toggleBtn = document.getElementById('theme-toggle');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
  });
}

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
      // ── Primary: load profile from Supabase (source of truth for student data) ──
      const { data: sbUser, error: sbErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.uid)
        .single();

      if (!sbErr && sbUser) {
        appState.userData = sbUser;
        appState.userRole = sbUser.role || 'student';
      } else {
        // ── Fallback: try Firebase Firestore ──
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            appState.userData = userDoc.data();
            appState.userRole = userDoc.data().role;
          } else {
            appState.userRole = null;
            appState.userData = { name: user.displayName || user.email, email: user.email, role: null };
          }
        } catch {
          appState.userRole = null;
          appState.userData = { name: user.displayName || 'aravind p', email: user.email, role: null };
        }
      }
    } catch (err) {
      console.warn('Profile load failed:', err);
      appState.userRole = null;
      appState.userData = { name: user.displayName || 'aravind p', email: user.email, role: null };
    }


    // Route to appropriate dashboard
    const currentHash = window.location.hash;
    if (appState.userRole === null) {
      router.navigate('/register');
    } else if (!currentHash || currentHash === '#/' || currentHash === '#/login' || currentHash === '#/register') {
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
