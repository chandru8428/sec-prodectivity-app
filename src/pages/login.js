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
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-6);position:relative;z-index:1;">
      
      <div style="display:flex;width:100%;max-width:1040px;gap:24px;flex-wrap:wrap;justify-content:center;align-items:stretch;">
        
        <!-- Left Panel -->
        <div class="glass-card" style="flex:1;min-width:320px;border-radius:24px;padding:48px;border:1px solid rgba(68,70,85,0.25);display:flex;flex-direction:column;justify-content:center;">
          <div>
            <div style="display:inline-block;background:#eab308;color:#ffffff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;margin-bottom:32px;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 4px 12px rgba(234,179,8,0.3);">CENTRAL AUTH</div>
            <h1 style="font-size:56px;font-weight:900;font-family:system-ui, -apple-system, sans-serif;line-height:1.1;margin-bottom:48px;color:var(--color-on-surface);letter-spacing:-0.03em;">Welcome to<br/>EduSync<br/>Workspace</h1>
            
            <div style="display:grid;grid-template-columns:auto 1fr;row-gap:24px;column-gap:16px;margin-bottom:48px;align-items:start;">
              <!-- Feature 1 -->
              <div style="display:flex;align-items:flex-start;gap:12px;padding-top:2px;">
                <span style="color:#eab308;font-size:16px;">●</span>
                <span style="font-weight:700;color:var(--color-on-surface);font-size:15px;">Record Book<br/>Forge:</span>
              </div>
              <div style="color:var(--color-on-surface-variant);font-size:15px;line-height:1.5;padding-top:2px;">
                Auto-generate lab records from<br/>GitHub.
              </div>
              
              <!-- Feature 2 -->
              <div style="display:flex;align-items:flex-start;gap:12px;padding-top:2px;">
                <span style="color:#eab308;font-size:16px;">●</span>
                <span style="font-weight:700;color:var(--color-on-surface);font-size:15px;">AI Schedule<br/>Crafter:</span>
              </div>
              <div style="color:var(--color-on-surface-variant);font-size:15px;line-height:1.5;padding-top:2px;">
                Create custom timetables and<br/>roadmaps.
              </div>

              <!-- Feature 3 -->
              <div style="display:flex;align-items:flex-start;gap:12px;padding-top:2px;">
                <span style="color:#eab308;font-size:16px;">●</span>
                <span style="font-weight:700;color:var(--color-on-surface);font-size:15px;">Academic Tracking:</span>
              </div>
              <div style="color:var(--color-on-surface-variant);font-size:15px;line-height:1.5;padding-top:2px;">
                Monitor your attendance and GPA.
              </div>

              <!-- Feature 4 -->
              <div style="display:flex;align-items:flex-start;gap:12px;padding-top:2px;">
                <span style="color:#eab308;font-size:16px;">●</span>
                <span style="font-weight:700;color:var(--color-on-surface);font-size:15px;">Knowledge<br/>Exchange:</span>
              </div>
              <div style="color:var(--color-on-surface-variant);font-size:15px;line-height:1.5;padding-top:2px;">
                Connect with peers on the Q&A<br/>board.
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="glass-card" style="flex:1;min-width:320px;border-radius:24px;padding:48px;border:1px solid rgba(68,70,85,0.25);color:var(--color-on-surface);display:flex;flex-direction:column;justify-content:center;position:relative;">
          
          <div style="text-align:center;margin-bottom:32px;">
            <div style="width:72px;height:72px;border-radius:var(--radius-xl);background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;box-shadow:var(--shadow-glow-primary);">🎓</div>
            <div style="text-align:left;">
              <h2 style="font-size:28px;font-weight:400;font-family:Georgia, serif;margin-bottom:8px;color:var(--color-on-surface);">Sign in</h2>
              <p style="color:var(--color-on-surface-variant);font-size:14px;margin:0;">Use your account credentials to continue.</p>
            </div>
          </div>
          
          <form id="student-form" style="display:flex;flex-direction:column;gap:16px;">
            <div class="form-group">
              <label class="form-label" for="student-identifier">Username</label>
              <div class="form-input-wrapper">
                <span class="input-icon icon-left" aria-hidden="true">👤</span>
                <input class="form-input" id="student-identifier" type="text" placeholder="e.g. 24013579 or email" required autocomplete="username" />
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
            
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-top:4px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--color-on-surface-variant);">
                <input type="checkbox" id="student-remember" style="width:16px;height:16px;accent-color:var(--color-primary-container);cursor:pointer;border-radius:4px;margin:0;" />
                Remember this device
              </label>
              <a href="#/forgot-password" style="color:var(--color-primary);text-decoration:none;font-weight:500;">Forgot Password?</a>
            </div>
            
            <button type="submit" class="btn btn-primary w-full" id="student-login-btn" style="margin-top:8px;padding:14px;">
              <span id="student-login-text">Sign in</span>
              <span id="student-login-spinner" class="spinner hidden" style="width:18px;height:18px;border-width:2px;"></span>
            </button>

            <div style="text-align:center;position:relative;margin:16px 0">
              <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:var(--color-outline);opacity:0.2"></div>
              <span style="font-size:var(--font-body-sm);color:var(--color-text-secondary);background:var(--color-surface);padding:0 var(--space-3);position:relative;z-index:1">or</span>
            </div>

            <button type="button" id="google-login-btn" class="btn btn-secondary w-full" style="padding:14px;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            
            <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--color-on-surface-variant);">
              <span style="font-weight:500;">New here?</span> <a href="#/register" style="color:var(--color-primary);text-decoration:none;font-weight:600;">Register here</a>
            </div>
          </form>
        </div>
        
      </div>
      
      <p style="text-align:center;margin-top:40px;font-size:12px;color:var(--color-outline);letter-spacing:0.04em;">
        By continuing you agree to the latest security and privacy terms.
      </p>
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
        router.navigate('/admin/dashboard');
      } else {
        // ── Student login — must have a registered profile in 'users' table ──
        const signedIn = await signInWithEmailAndPassword(auth, email, password);
        const uid = signedIn?.user?.uid || signedIn?.user?.id;

        // Verify the user exists in our 'users' table (registered via app)
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('id, role, name')
          .eq('id', uid)
          .single();

        if (profileErr || !profile) {
          // Not registered via the app — sign out and reject
          await supabase.auth.signOut();
          throw new Error('NOT_REGISTERED');
        }

        showToast(`Welcome back, ${profile.name || 'Student'}! 👋`, 'success');
        router.navigate(profile.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      }
    } catch (err) {
      if (err.message === 'NOT_REGISTERED') {
        showToast('🚫 Access denied. You are not registered in EduSync. Please ask your admin to register you.', 'error', 6000);
      } else {
        showToast(friendlyAuthError(err), 'error');
      }
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
      const uid    = user?.uid || user?.id;

      // Check if this Google user is registered in our 'users' table
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, role, name')
        .eq('id', uid)
        .single();

      if (profileErr || !profile) {
        // Not registered — sign out and reject
        await supabase.auth.signOut();
        showToast('🚫 Access denied. Your Google account is not registered in EduSync. Please contact your admin.', 'error', 6000);
        return;
      }

      showToast(`Welcome, ${profile.name || user.displayName || 'Student'}! 🎉`, 'success');
      router.navigate(profile.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
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
