import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  doc, setDoc, getDoc,
  auth, googleProvider, db
} from '/src/firebase.js';
import { supabase } from '/src/supabase.js';
import { showToast } from '../main.js';
import { router } from '../router.js';

// ── Admin credentials ──
const ADMIN_EMAIL    = 'chandru.k1282006@gmail.com';
const ADMIN_REG_NO   = 'RA212224220017';
const ADMIN_PASSWORD = 'chandru@8428';

export function render(root) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-6);position:relative;z-index:1">
      <div style="width:100%;max-width:460px">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:var(--space-8)">
          <div style="width:72px;height:72px;border-radius:var(--radius-xl);background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto var(--space-4);box-shadow:var(--shadow-glow-primary)">🎓</div>
          <h1 style="font-size:var(--font-display);font-weight:900;letter-spacing:-0.03em;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1">EduSync</h1>
          <p style="color:var(--color-on-surface-variant);margin-top:var(--space-2);font-size:var(--font-body-sm);letter-spacing:0.06em;text-transform:uppercase">Your Academic Command Center</p>
        </div>

        <!-- Card -->
        <div class="glass-card" style="border:1px solid rgba(68,70,85,0.25);">

          <!-- Single unified login form — admin auto-detected by email -->
          <form id="student-form">
            <div class="flex flex-col gap-4">
              <div class="form-group">
                <label class="form-label" for="student-identifier">Email or Register Number</label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left" aria-hidden="true">👤</span>
                  <input class="form-input" id="student-identifier" type="text" placeholder="Gmail or Reg. No (e.g. 311824110042)" required autocomplete="username" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="student-password">Password</label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left" aria-hidden="true">🔒</span>
                  <input class="form-input" id="student-password" type="password" placeholder="Enter your password" required autocomplete="current-password" />
                  <button type="button" class="input-icon" id="toggle-student-pass" aria-label="Show password">👁</button>
                </div>
              </div>
              <div class="flex items-center justify-between" style="margin-top:var(--space-1)">
                <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--font-body-sm);color:var(--color-on-surface-variant);cursor:pointer">
                  <input type="checkbox" id="student-remember" style="accent-color:var(--color-primary-container);width:16px;height:16px;min-width:16px;min-height:16px;margin:0;flex-shrink:0;"> Remember me
                </label>
                <a href="#/forgot-password" style="font-size:var(--font-body-sm);color:var(--color-primary);text-decoration:none;font-weight:500">Forgot password?</a>
              </div>
              <button type="submit" class="btn btn-primary btn-lg w-full" id="student-login-btn" style="margin-top:var(--space-2)">
                <span id="student-login-text">Login to EduSync</span>
                <span id="student-login-spinner" class="spinner hidden" style="width:18px;height:18px;border-width:2px"></span>
              </button>
              <div style="text-align:center;position:relative;margin:var(--space-2) 0">
                <span style="font-size:var(--font-body-sm);color:var(--color-outline);background:var(--color-surface-container);padding:0 var(--space-3);position:relative;z-index:1">or</span>
                <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:var(--border-color)"></div>
              </div>
              <button type="button" id="google-login-btn" class="btn btn-secondary w-full">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <p style="text-align:center;font-size:var(--font-body-sm);color:var(--color-on-surface-variant)">
                Don't have an account? <a href="#/register" style="color:var(--color-primary);text-decoration:none;font-weight:600">Register</a>
              </p>
            </div>
          </form>

        </div>

        <!-- Footer -->
        <p style="text-align:center;margin-top:var(--space-5);font-size:11px;color:var(--color-outline);letter-spacing:0.04em">
          SAVEETHA ENGINEERING COLLEGE · AUTONOMOUS · ANNA UNIVERSITY AFFILIATED
        </p>
      </div>
    </div>
  `;

  // ── Password toggle ──
  root.querySelector('#toggle-student-pass').addEventListener('click', () => {
    const inp = root.querySelector('#student-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // ── Unified Login (student + admin auto-detect) ──
  root.querySelector('#student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = root.querySelector('#student-identifier').value.trim();
    const password   = root.querySelector('#student-password').value;

    const btn  = root.querySelector('#student-login-btn');
    const text = root.querySelector('#student-login-text');
    const spin = root.querySelector('#student-login-spinner');

    btn.disabled = true;
    text.classList.add('hidden');
    spin.classList.remove('hidden');

    try {
      let email = identifier;

      // If not an email, look up by register number via Supabase (source of truth)
      if (!identifier.includes('@')) {
        const regNo = identifier.trim().toUpperCase();
        const { data: matched, error: lookupErr } = await supabase
          .from('users')
          .select('email')
          .eq('registerNumber', regNo)
          .single();
        if (lookupErr || !matched?.email) {
          throw new Error('No account found for register number ' + identifier + '. Please register first.');
        }
        email = matched.email;
      }

      // Admin first-time account creation
      if (email === ADMIN_EMAIL) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          const code = err?.code || '';
          if ((code === 'auth/user-not-found' || code === 'auth/invalid-credential') && password === ADMIN_PASSWORD) {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', cred.user.uid), {
              name: 'Chandru K',
              email: ADMIN_EMAIL,
              registerNumber: ADMIN_REG_NO,
              role: 'admin',
              createdAt: new Date().toISOString(),
            });
          } else {
            throw err;
          }
        }
        showToast('Welcome, Admin! ⚙️', 'success');
        // Explicit redirect — don't wait for onAuthStateChanged race
        router.navigate('/admin/dashboard');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back! 👋', 'success');
        // Explicit redirect — don't wait for onAuthStateChanged race
        router.navigate('/student/dashboard');
      }
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
      btn.disabled = false;
      text.classList.remove('hidden');
      spin.classList.add('hidden');
    }
  });

  // ── Google Login ──
  root.querySelector('#google-login-btn').addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user   = result.user;
      const ref  = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          name: user.displayName,
          email: user.email,
          role: 'student',
          createdAt: new Date().toISOString(),
        });
      }
      showToast('Welcome! 🎉', 'success');
      // Explicit redirect — don't wait for onAuthStateChanged race
      router.navigate('/student/dashboard');
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
    }
  });
}

// ── Human-readable Firebase Auth error messages ──────────────────────────────
function friendlyAuthError(err) {
  const code = err?.code || '';
  const msg  = err?.message || 'Unknown error';

  if (code === 'auth/configuration-not-found' || msg.includes('configuration-not-found'))
    return '⚠️ Authentication not configured. Enable Email/Password in Firebase Console → Authentication → Sign-in providers.';

  if (code === 'auth/operation-not-allowed')
    return '⚠️ Email/Password sign-in is disabled. Go to Firebase Console → Authentication → Sign-in providers → Enable Email/Password.';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password')
    return 'Incorrect password. Please try again.';

  if (code === 'auth/user-not-found')
    return 'No account found with this email. Please register first.';

  if (code === 'auth/email-already-in-use')
    return 'This email is already registered. Please login instead.';

  if (code === 'auth/weak-password')
    return 'Password too weak — must be at least 6 characters.';

  if (code === 'auth/invalid-email')
    return 'Invalid email address format.';

  if (code === 'auth/too-many-requests')
    return 'Too many failed attempts. Please wait a few minutes and try again.';

  if (code === 'auth/popup-closed-by-user')
    return 'Google sign-in was cancelled.';

  if (code === 'auth/network-request-failed')
    return 'Network error. Please check your internet connection.';

  // Generic fallback
  return msg.replace('Firebase: ', '').replace(/ \(auth\/.+\)\.?$/, '') || 'Login failed. Please try again.';
}
