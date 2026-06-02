import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  doc, setDoc, getDoc,
  auth, googleProvider, db
} from '../../lib/firebase.js';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../app/main.js';
import { router } from '../../app/router.js';

// ── Admin credentials ──
const ADMIN_EMAIL    = 'chandru.k1282006@gmail.com';
const ADMIN_REG_NO   = 'RA212224220017';
const ADMIN_PASSWORD = 'chandru@8428';

export function render(root) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px;position:relative;z-index:1;overflow-y:auto;overflow-x:hidden;">
      
      <!-- Theme Toggle for Login Page -->
      <div style="position:absolute;top:16px;right:16px;z-index:100;">
        <button id="login-theme-toggle" class="header-theme-toggle" aria-label="Toggle dark/light mode" style="background:var(--color-surface);border:1px solid var(--border-color);box-shadow:var(--shadow-sm);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--color-on-surface);cursor:pointer;">
          <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </button>
      </div>

      <div style="margin:auto;display:flex;width:100%;max-width:1040px;gap:24px;flex-wrap:wrap;justify-content:center;align-items:stretch;padding-top:40px;">
        
        <!-- Left Panel -->
        <div class="glass-card" style="flex:1;min-width:320px;border-radius:24px;padding:48px;border:1px solid rgba(68,70,85,0.25);display:flex;flex-direction:column;justify-content:center;">
          <div>
           <div style="display:inline-block;background:#eab308;color:#ffffff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;margin-bottom:32px;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 4px 12px rgba(234,179,8,0.3);">CENTRAL AUTH</div>
            <h1 class="login-hero-title" style="font-size:clamp(2.2rem, 8vw, 3.5rem);font-weight:900;font-family:system-ui, -apple-system, sans-serif;line-height:1.1;margin-bottom:16px;color:var(--color-on-surface);letter-spacing:-0.03em;">Welcome to<br/>EduSync<br/>Workspace</h1>
            
            <div class="login-dev-badge" style="display:inline-flex;align-items:center;gap:16px;margin-bottom:48px;padding:12px 24px;background:var(--color-surface-container);border:1px solid var(--border-color);border-radius:100px;box-shadow:var(--shadow-sm);transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='none';this.style.boxShadow='var(--shadow-sm)'">
              <span style="color:var(--color-on-surface);font-size:16px;">Developed by <strong style="font-size:17px;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Chandru K</strong></span>
              <div style="width:1px;height:24px;background:var(--border-color);"></div>
              <div style="display:flex;align-items:center;gap:12px;">
                <a href="https://www.linkedin.com/in/chandru-k2006" target="_blank" aria-label="LinkedIn" style="color:#0a66c2;display:flex;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='none'">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://github.com/chandru8428" target="_blank" aria-label="GitHub" style="color:var(--color-on-surface);display:flex;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='none'">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>

            <div class="login-features-mobile" style="margin-bottom:48px">
              <!-- Feature 1 -->
              <div class="login-feature-item">
                <span class="login-feature-dot">●</span>
                <div class="login-feature-content">
                  <span class="login-feature-title">Record Book Forge</span>
                  <span class="login-feature-desc">Auto-generate lab records from GitHub.</span>
                </div>
              </div>
              <!-- Feature 2 -->
              <div class="login-feature-item">
                <span class="login-feature-dot">●</span>
                <div class="login-feature-content">
                  <span class="login-feature-title">AI Schedule Crafter</span>
                  <span class="login-feature-desc">Create custom timetables and roadmaps.</span>
                </div>
              </div>
              <!-- Feature 3 -->
              <div class="login-feature-item">
                <span class="login-feature-dot">●</span>
                <div class="login-feature-content">
                  <span class="login-feature-title">Academic Tracking</span>
                  <span class="login-feature-desc">Monitor your attendance and GPA.</span>
                </div>
              </div>
              <!-- Feature 4 -->
              <div class="login-feature-item">
                <span class="login-feature-dot">●</span>
                <div class="login-feature-content">
                  <span class="login-feature-title">Knowledge Exchange</span>
                  <span class="login-feature-desc">Connect with peers on the Q&A board.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="glass-card login-panel-form" style="flex:1;min-width:320px;border-radius:24px;padding:48px;border:1px solid rgba(68,70,85,0.25);color:var(--color-on-surface);display:flex;flex-direction:column;justify-content:center;position:relative;">
          
          <div style="text-align:center;margin-bottom:32px;">
            <div style="width:72px;height:72px;border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:var(--shadow-glow-primary);overflow:hidden;background:white;">
              <img src="/logo-new.png" alt="EduSync Logo" style="width:100%;height:100%;object-fit:contain;" />
            </div>
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
                <input class="form-input" id="student-identifier" type="text" placeholder="Register No. or Email" required autocomplete="username" />
              </div>
              <small style="color:var(--color-on-surface-variant);font-size:12px;line-height:1.4;margin-top:4px;">e.g. 212224240015 or aravind.p@email.com</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="student-password">Password</label>
              <div class="form-input-wrapper">
                <span class="input-icon icon-left" aria-hidden="true">🔒</span>
                <input class="form-input" id="student-password" type="password" placeholder="Enter your password" required autocomplete="current-password" />
                <button type="button" class="input-icon" id="toggle-student-pass" aria-label="Show password">👁</button>
              </div>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-top:8px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--color-on-surface-variant);min-height:44px;padding:4px 0;">
                <input type="checkbox" id="student-remember" style="width:20px;height:20px;accent-color:var(--color-primary-container);cursor:pointer;border-radius:4px;margin:0;flex-shrink:0;" />
                Remember this device
              </label>
              <a href="#/forgot-password" style="color:var(--color-primary);text-decoration:none;font-weight:500;min-height:44px;display:inline-flex;align-items:center;padding:4px 0;">Forgot Password?</a>
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
      
      <p style="text-align:center;margin:40px 0 16px;font-size:12px;color:var(--color-on-surface-variant);letter-spacing:0.04em;position:relative;z-index:10;width:100%;">
        By continuing you agree to our <a href="#" style="color:var(--color-primary);text-decoration:underline;">Terms of Service</a> and <a href="#" style="color:var(--color-primary);text-decoration:underline;">Privacy Policy</a>.
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
        let profile = null;
        let role = null;
        let name = null;

        const { data: sbProfile, error: profileErr } = await supabase
          .from('users')
          .select('id, role, name')
          .eq('id', uid)
          .single();

        if (!profileErr && sbProfile) {
          profile = sbProfile;
          role = sbProfile.role;
          name = sbProfile.name;
        } else {
          // Fallback to Firebase Firestore for older users
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            profile = userDoc.data();
            role = profile.role || 'student';
            name = profile.name || profile.firstName;
          }
        }

        if (!profile) {
          // Not registered via the app — sign out and reject
          await supabase.auth.signOut();
          throw new Error('NOT_REGISTERED');
        }

        showToast(`Welcome back, ${name || 'Aravind P'}! 👋`, 'success');
        router.navigate(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
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
      let profile = null;
      let role = null;
      let name = null;

      const { data: sbProfile, error: profileErr } = await supabase
        .from('users')
        .select('id, role, name')
        .eq('id', uid)
        .single();

      if (!profileErr && sbProfile) {
        profile = sbProfile;
        role = sbProfile.role;
        name = sbProfile.name;
      } else {
        // Fallback to Firebase Firestore for older users
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          profile = userDoc.data();
          role = profile.role || 'student';
          name = profile.name || profile.firstName;
        }
      }

      if (!profile) {
        // Not registered — redirect to register to complete profile
        showToast(`Welcome! Please complete your registration.`, 'info');
        router.navigate('/register');
        return;
      }

      showToast(`Welcome, ${name || user.displayName || 'Aravind P'}! 🎉`, 'success');
      router.navigate(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
    }
  });

  // ── Theme Toggle Logic ──
  const themeToggle = root.querySelector('#login-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
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
