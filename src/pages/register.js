import {
  createUserWithEmailAndPassword,
  auth
} from '/src/firebase.js';
import { supabase } from '/src/supabase.js';
import { showToast } from '../main.js';

export function render(root) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-6);position:relative;z-index:1">
      <div style="width:100%;max-width:500px">
        <div style="text-align:center;margin-bottom:var(--space-8)">
          <div style="width:64px;height:64px;border-radius:var(--radius-xl);background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto var(--space-4);box-shadow:var(--shadow-glow-primary)">🎓</div>
          <h1 style="font-size:2rem;font-weight:900;letter-spacing:-0.02em;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Create Account</h1>
          <p style="color:var(--color-on-surface-variant);margin-top:var(--space-2);font-size:var(--font-body-sm)">Join EduSync — Your Academic Command Center</p>
        </div>

        <div class="glass-card" style="border:1px solid rgba(68,70,85,0.25)">

          <!-- Error Banner -->
          <div id="reg-error" class="alert alert-danger hidden" style="margin-bottom:var(--space-4)">
            <span>⚠️</span><span id="reg-error-msg"></span>
          </div>

          <form id="register-form">
            <div class="flex flex-col gap-4">

              <div class="grid grid-2 gap-4">
                <div class="form-group">
                  <label class="form-label">First Name</label>
                  <input class="form-input" id="first-name" type="text" placeholder="e.g. Arjun" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name</label>
                  <input class="form-input" id="last-name" type="text" placeholder="e.g. S" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">College Email <span style="color:var(--color-danger)">*</span></label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left">📧</span>
                  <input class="form-input" id="reg-email" type="email" placeholder="yourname@example.com" required autocomplete="email" />
                </div>
                <div style="font-size:11px;color:var(--color-on-surface-variant);margin-top:4px">Use any valid email address</div>
              </div>

              <div class="form-group">
                <label class="form-label">Register Number <span style="color:var(--color-danger)">*</span></label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left">🪪</span>
                  <input class="form-input" id="reg-number" type="text" placeholder="e.g. 311824110042" required />
                </div>
                <div style="font-size:11px;color:var(--color-on-surface-variant);margin-top:4px">Your college register number — used to match exam schedules</div>
              </div>

              <div class="grid grid-2 gap-4">
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <select class="form-select" id="department">
                    <option value="">Select Department</option>
                    <option>Computer Science & Engineering</option>
                    <option>Information Technology</option>
                    <option>Electronics & Communication Engineering</option>
                    <option>Electrical & Electronics Engineering</option>
                    <option>Mechanical Engineering</option>
                    <option>Civil Engineering</option>
                    <option>Artificial Intelligence & Data Science</option>
                    <option>Artificial Intelligence & Machine Learning</option>
                    <option>Cyber Security</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Semester</label>
                  <select class="form-select" id="semester">
                    <option value="">Select Semester</option>
                    ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}">Semester ${s}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-password">Password <span style="color:var(--color-danger)">*</span></label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left" aria-hidden="true">🔒</span>
                  <input class="form-input" id="reg-password" type="password" placeholder="Min. 8 characters" required minlength="8" autocomplete="new-password" />
                  <button type="button" class="input-icon" id="toggle-reg-pass" aria-label="Show password">👁</button>
                </div>
                <!-- Strength bar -->
                <div id="pw-strength-bar-wrap" style="margin-top:6px;height:4px;border-radius:4px;background:rgba(0,0,0,0.08);overflow:hidden">
                  <div id="pw-strength-bar" style="height:100%;width:0%;border-radius:4px;transition:width 0.3s,background 0.3s"></div>
                </div>
                <div id="pw-strength-label" style="font-size:11px;margin-top:4px;color:var(--color-outline);min-height:16px"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-confirm">Confirm Password <span style="color:var(--color-danger)">*</span></label>
                <div class="form-input-wrapper">
                  <span class="input-icon icon-left" aria-hidden="true">🔒</span>
                  <input class="form-input" id="reg-confirm" type="password" placeholder="Re-enter password" required autocomplete="new-password" />
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg w-full" id="register-btn">
                <span id="reg-text">🎓 Create Account</span>
                <span id="reg-spinner" class="spinner hidden" style="width:18px;height:18px;border-width:2px"></span>
              </button>

              <p style="text-align:center;font-size:var(--font-body-sm);color:var(--color-on-surface-variant)">
                Already have an account? <a href="#/login" style="color:var(--color-primary);text-decoration:none;font-weight:600">Login</a>
              </p>
            </div>
          </form>
        </div>

        <p style="text-align:center;margin-top:var(--space-5);font-size:11px;color:var(--color-outline);letter-spacing:0.04em">
          SAVEETHA ENGINEERING COLLEGE · AUTONOMOUS
        </p>
      </div>
    </div>
  `;

  // Toggle password
  root.querySelector('#toggle-reg-pass').addEventListener('click', () => {
    const inp = root.querySelector('#reg-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Password strength meter
  root.querySelector('#reg-password').addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = root.querySelector('#pw-strength-bar');
    const lbl = root.querySelector('#pw-strength-label');
    if (!val) { bar.style.width = '0%'; lbl.textContent = ''; return; }
    const hasUpper  = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);
    const long = val.length >= 12;
    let score = 0;
    if (val.length >= 8)  score++;
    if (hasUpper)         score++;
    if (hasNumber)        score++;
    if (hasSpecial || long) score++;
    const levels = [
      { w: '20%', color: '#ef4444', text: 'Too weak' },
      { w: '45%', color: '#f97316', text: 'Weak' },
      { w: '70%', color: '#eab308', text: 'Fair' },
      { w: '100%', color: '#22c55e', text: 'Strong ✓' },
    ];
    const lvl = levels[Math.max(0, score - 1)];
    bar.style.width = lvl.w;
    bar.style.background = lvl.color;
    lbl.textContent = lvl.text;
    lbl.style.color = lvl.color;
  });

  const showError = (msg) => {
    const box = root.querySelector('#reg-error');
    root.querySelector('#reg-error-msg').textContent = msg;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const hideError = () => root.querySelector('#reg-error').classList.add('hidden');

  root.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const firstName = root.querySelector('#first-name').value.trim();
    const lastName  = root.querySelector('#last-name').value.trim();
    const email     = root.querySelector('#reg-email').value.trim().toLowerCase();
    const regNumber = root.querySelector('#reg-number').value.trim(); // keep original case
    const dept      = root.querySelector('#department').value;
    const semester  = root.querySelector('#semester').value;
    const password  = root.querySelector('#reg-password').value;
    const confirm   = root.querySelector('#reg-confirm').value;

    // Client-side validation
    if (!firstName) { showError('Please enter your first name.'); return; }
    if (!email)     { showError('Please enter your email.'); return; }
    if (!regNumber) { showError('Please enter your register number.'); return; }
    if (regNumber.includes('@')) {
      showError('Register number cannot be an email. Enter your college register number (e.g. 311824110042).');
      return;
    }
    if (password.length < 8) { showError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { showError('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(password)) { showError('Password must contain at least one number.'); return; }
    if (password !== confirm) { showError('Passwords do not match.'); return; }

    const btn  = root.querySelector('#register-btn');
    const text = root.querySelector('#reg-text');
    const spin = root.querySelector('#reg-spinner');
    btn.disabled = true;
    text.classList.add('hidden');
    spin.classList.remove('hidden');

    try {
      // Check if register number already in use (Supabase is source of truth)
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('registerNumber', regNumber)
        .limit(1);
      if (existing && existing.length > 0) {
        showError(`Register number ${regNumber} is already registered. Please login instead.`);
        btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
        return;
      }

      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Store user profile in Supabase
      const { error: insertErr } = await supabase.from('users').insert({
        id: cred.user.uid,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email,
        registerNumber: regNumber,
        department: dept || '',
        semester: semester ? Number(semester) : null,
        role: 'student',
        createdAt: new Date().toISOString(),
      });
      if (insertErr) throw insertErr;

      showToast('Account created! Welcome to EduSync 🎉', 'success');
      // Auth state change in main.js will auto-redirect to dashboard
    } catch (err) {
      const msg = friendlyRegError(err);
      showError(msg);
      btn.disabled = false;
      text.classList.remove('hidden');
      spin.classList.add('hidden');
    }
  });
}

function friendlyRegError(err) {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use')
    return 'This email is already registered. Please login instead.';
  if (code === 'auth/invalid-email')
    return 'Please enter a valid email address.';
  if (code === 'auth/weak-password')
    return 'Password is too weak. Use at least 6 characters.';
  if (code === 'auth/operation-not-allowed')
    return '⚠️ Email/Password sign-in is disabled. The admin needs to enable it in Firebase Console → Authentication → Sign-in providers.';
  if (code === 'auth/configuration-not-found')
    return '⚠️ Firebase Authentication is not configured yet. Admin must enable it in Firebase Console.';
  if (code === 'auth/network-request-failed')
    return 'Network error. Please check your internet connection and try again.';
  if (code === 'auth/too-many-requests')
    return 'Too many attempts. Please wait a few minutes and try again.';
  return err.message?.replace('Firebase: ', '').replace(/ \(auth\/.+\)\.?$/, '') || 'Registration failed. Please try again.';
}
