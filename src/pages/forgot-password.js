import { auth } from '/src/firebase.js';
import { sendPasswordResetEmail } from 'firebase/auth';
import { showToast } from '../main.js';
import { router } from '../router.js';

export function render(root) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-6);position:relative;z-index:1">
      <div style="width:100%;max-width:420px">

        <div style="text-align:center;margin-bottom:var(--space-8)">
          <div style="width:72px;height:72px;border-radius:var(--radius-xl);background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto var(--space-4);box-shadow:var(--shadow-glow-primary)">🔑</div>
          <h1 style="font-size:var(--font-display);font-weight:900;letter-spacing:-0.03em;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1">Reset Password</h1>
          <p style="color:var(--color-on-surface-variant);margin-top:var(--space-2);font-size:var(--font-body-sm)">We'll send a secure reset link to your email</p>
        </div>

        <div class="glass-card" style="border:1px solid rgba(68,70,85,0.25)">

          <div id="fp-success" class="hidden" style="text-align:center;padding:var(--space-6)">
            <div style="font-size:56px;margin-bottom:var(--space-4)">📬</div>
            <h2 class="text-title" style="margin-bottom:var(--space-3)">Check Your Inbox</h2>
            <p class="text-muted" style="margin-bottom:var(--space-6)">
              A password reset link has been sent to <strong id="fp-sent-email"></strong>.
              <br><br>Check your spam folder if you don't see it within a minute.
            </p>
            <a href="#/login" class="btn btn-primary w-full" style="display:inline-block;text-align:center">← Back to Login</a>
          </div>

          <form id="fp-form" class="flex flex-col gap-4">
            <div id="fp-error" class="alert alert-danger hidden" style="margin-bottom:var(--space-2)">
              <span aria-hidden="true">⚠️</span><span id="fp-error-msg"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="fp-email">College Email</label>
              <div class="form-input-wrapper">
                <span class="input-icon icon-left" aria-hidden="true">📧</span>
                <input class="form-input" id="fp-email" type="email"
                  placeholder="yourname@example.com" required autocomplete="email" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" id="fp-btn">
              <span id="fp-text">Send Reset Link</span>
              <span id="fp-spinner" class="spinner hidden" style="width:18px;height:18px;border-width:2px"></span>
            </button>

            <p style="text-align:center;font-size:var(--font-body-sm);color:var(--color-on-surface-variant)">
              Remember your password? <a href="#/login" style="color:var(--color-primary);text-decoration:none;font-weight:600">Login</a>
            </p>
          </form>
        </div>

        <p style="text-align:center;margin-top:var(--space-5);font-size:11px;color:var(--color-outline);letter-spacing:0.04em">
          SAVEETHA ENGINEERING COLLEGE · AUTONOMOUS · ANNA UNIVERSITY AFFILIATED
        </p>
      </div>
    </div>
  `;

  const form    = root.querySelector('#fp-form');
  const btn     = root.querySelector('#fp-btn');
  const text    = root.querySelector('#fp-text');
  const spinner = root.querySelector('#fp-spinner');
  const errBox  = root.querySelector('#fp-error');
  const errMsg  = root.querySelector('#fp-error-msg');
  const success = root.querySelector('#fp-success');

  const showError = (msg) => {
    errMsg.textContent = msg;
    errBox.classList.remove('hidden');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = root.querySelector('#fp-email').value.trim().toLowerCase();
    if (!email) { showError('Please enter your email address.'); return; }

    btn.disabled = true;
    text.classList.add('hidden');
    spinner.classList.remove('hidden');
    errBox.classList.add('hidden');

    try {
      await sendPasswordResetEmail(auth, email);
      root.querySelector('#fp-sent-email').textContent = email;
      form.classList.add('hidden');
      success.classList.remove('hidden');
      showToast('Reset link sent! Check your inbox 📬', 'success');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        showError('No account found with that email address.');
      } else if (code === 'auth/too-many-requests') {
        showError('Too many requests. Please wait a few minutes and try again.');
      } else {
        showError('Something went wrong. Please try again.');
      }
      btn.disabled = false;
      text.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  });
}
