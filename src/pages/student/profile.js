import { createLayout } from '../../components/sidebar.js';
import { appState, showToast } from '../../main.js';
import { auth } from '/src/firebase.js';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { supabase } from '/src/supabase.js';

export function render(root) {
  const user = appState.userData || {};
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const layout = createLayout('My Profile', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div style="max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-6)">

      <!-- Avatar hero card -->
      <div class="glass-card" style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap">
        <div id="profile-avatar" style="width:88px;height:88px;border-radius:24px;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#fff;box-shadow:var(--shadow-glow-primary);flex-shrink:0;letter-spacing:-1px">
          ${initials}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:1.6rem;font-weight:900;color:var(--color-on-surface);letter-spacing:-0.02em" id="profile-name-display">${user.name || '—'}</div>
          <div style="font-size:var(--font-body-sm);color:var(--color-on-surface-variant);margin-top:4px" id="profile-regnum-display">${user.registerNumber || ''} · ${user.department || ''}</div>
          <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2);flex-wrap:wrap">
            <span class="badge badge-primary">Semester ${user.semester || '—'}</span>
            <span class="badge" style="background:var(--color-success);color:#fff">Student</span>
          </div>
        </div>
      </div>

      <!-- Edit Profile -->
      <div class="glass-card">
        <h2 class="text-title" style="margin-bottom:var(--space-5)">✏️ Edit Profile</h2>
        <div id="profile-edit-error" class="alert alert-danger hidden" style="margin-bottom:var(--space-4)">
          <span aria-hidden="true">⚠️</span><span id="profile-edit-error-msg"></span>
        </div>
        <form id="profile-edit-form" class="flex flex-col gap-4">
          <div class="grid grid-2 gap-4">
            <div class="form-group">
              <label class="form-label" for="pf-first">First Name</label>
              <input class="form-input" id="pf-first" type="text" value="${user.firstName || (user.name?.split(' ')[0]) || ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="pf-last">Last Name</label>
              <input class="form-input" id="pf-last" type="text" value="${user.lastName || (user.name?.split(' ').slice(1).join(' ')) || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pf-email">Email</label>
            <input class="form-input" id="pf-email" type="email" value="${user.email || ''}" disabled style="opacity:0.6;cursor:not-allowed" />
            <div style="font-size:11px;color:var(--color-outline);margin-top:4px">Email cannot be changed</div>
          </div>
          <div class="grid grid-2 gap-4">
            <div class="form-group">
              <label class="form-label" for="pf-dept">Department</label>
              <select class="form-select" id="pf-dept">
                <option value="">Select Department</option>
                ${['Computer Science & Engineering','Information Technology','Electronics & Communication Engineering','Electrical & Electronics Engineering','Mechanical Engineering','Civil Engineering','Artificial Intelligence & Data Science','Artificial Intelligence & Machine Learning','Cyber Security'].map(d => `<option value="${d}" ${user.department === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="pf-sem">Semester</label>
              <select class="form-select" id="pf-sem">
                ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}" ${user.semester == s ? 'selected' : ''}>Semester ${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="pf-save-btn" style="align-self:flex-start;min-width:140px">
            <span id="pf-save-text">Save Changes</span>
            <span id="pf-save-spin" class="spinner hidden" style="width:16px;height:16px;border-width:2px"></span>
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="glass-card">
        <h2 class="text-title" style="margin-bottom:var(--space-5)">🔐 Change Password</h2>
        <div id="pw-error" class="alert alert-danger hidden" style="margin-bottom:var(--space-4)">
          <span aria-hidden="true">⚠️</span><span id="pw-error-msg"></span>
        </div>
        <div id="pw-success" class="alert alert-success hidden" style="margin-bottom:var(--space-4)">
          <span>✅</span><span>Password updated successfully!</span>
        </div>
        <form id="pw-change-form" class="flex flex-col gap-4">
          <div class="form-group">
            <label class="form-label" for="pw-current">Current Password</label>
            <div class="form-input-wrapper">
              <span class="input-icon icon-left" aria-hidden="true">🔒</span>
              <input class="form-input" id="pw-current" type="password" placeholder="Your current password" autocomplete="current-password" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pw-new">New Password</label>
            <div class="form-input-wrapper">
              <span class="input-icon icon-left" aria-hidden="true">🔑</span>
              <input class="form-input" id="pw-new" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" autocomplete="new-password" required minlength="8" />
            </div>
            <div id="pw-new-bar-wrap" style="margin-top:6px;height:4px;border-radius:4px;background:rgba(0,0,0,0.08);overflow:hidden">
              <div id="pw-new-bar" style="height:100%;width:0%;border-radius:4px;transition:width 0.3s,background 0.3s"></div>
            </div>
            <div id="pw-new-label" style="font-size:11px;margin-top:4px;color:var(--color-outline);min-height:16px"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pw-confirm">Confirm New Password</label>
            <div class="form-input-wrapper">
              <span class="input-icon icon-left" aria-hidden="true">🔑</span>
              <input class="form-input" id="pw-confirm" type="password" placeholder="Re-enter new password" autocomplete="new-password" required />
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="pw-save-btn" style="align-self:flex-start;min-width:160px">
            <span id="pw-save-text">Update Password</span>
            <span id="pw-save-spin" class="spinner hidden" style="width:16px;height:16px;border-width:2px"></span>
          </button>
        </form>
      </div>

      <!-- Account info -->
      <div class="glass-card" style="display:flex;gap:var(--space-4);flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <div class="text-label-sm text-muted" style="margin-bottom:4px">Register Number</div>
          <div style="font-weight:700;color:var(--color-on-surface)">${user.registerNumber || '—'}</div>
        </div>
        <div style="flex:1;min-width:180px">
          <div class="text-label-sm text-muted" style="margin-bottom:4px">Account Created</div>
          <div style="font-weight:600;color:var(--color-on-surface)">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}</div>
        </div>
        <div style="flex:1;min-width:180px">
          <div class="text-label-sm text-muted" style="margin-bottom:4px">Role</div>
          <div style="font-weight:600;color:var(--color-on-surface);text-transform:capitalize">${user.role || 'student'}</div>
        </div>
      </div>

    </div>
  `;

  // ── Profile save ──────────────────────────────────────────────────────────────
  const editForm  = main.querySelector('#profile-edit-form');
  const saveBtn   = main.querySelector('#pf-save-btn');
  const saveText  = main.querySelector('#pf-save-text');
  const saveSpin  = main.querySelector('#pf-save-spin');
  const editError = main.querySelector('#profile-edit-error');
  const editErrMsg= main.querySelector('#profile-edit-error-msg');

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editError.classList.add('hidden');
    const firstName  = main.querySelector('#pf-first').value.trim();
    const lastName   = main.querySelector('#pf-last').value.trim();
    const department = main.querySelector('#pf-dept').value;
    const semester   = parseInt(main.querySelector('#pf-sem').value);
    if (!firstName) { editErrMsg.textContent = 'First name is required.'; editError.classList.remove('hidden'); return; }

    saveBtn.disabled = true; saveText.classList.add('hidden'); saveSpin.classList.remove('hidden');

    try {
      const uid = appState.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');
      const newName = `${firstName} ${lastName}`.trim();
      const { error } = await supabase.from('users').update({ name: newName, firstName, lastName, department, semester }).eq('id', uid);
      if (error) throw error;
      // Update local state
      if (appState.userData) {
        appState.userData.name = newName;
        appState.userData.firstName = firstName;
        appState.userData.lastName = lastName;
        appState.userData.department = department;
        appState.userData.semester = semester;
      }
      // Update avatar and display
      const newInitials = newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      main.querySelector('#profile-avatar').textContent = newInitials;
      main.querySelector('#profile-name-display').textContent = newName;
      main.querySelector('#profile-regnum-display').textContent = `${user.registerNumber || ''} · ${department}`;
      showToast('Profile updated successfully! ✅', 'success');
    } catch (err) {
      editErrMsg.textContent = err.message || 'Failed to update profile.';
      editError.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false; saveText.classList.remove('hidden'); saveSpin.classList.add('hidden');
    }
  });

  // ── Password strength bar ─────────────────────────────────────────────────────
  main.querySelector('#pw-new').addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = main.querySelector('#pw-new-bar');
    const lbl = main.querySelector('#pw-new-label');
    if (!val) { bar.style.width = '0%'; lbl.textContent = ''; return; }
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val) || val.length >= 12) score++;
    const levels = [
      { w: '20%', color: '#ef4444', text: 'Too weak' },
      { w: '45%', color: '#f97316', text: 'Weak' },
      { w: '70%', color: '#eab308', text: 'Fair' },
      { w: '100%', color: '#22c55e', text: 'Strong ✓' },
    ];
    const lvl = levels[Math.max(0, score - 1)];
    bar.style.width = lvl.w; bar.style.background = lvl.color;
    lbl.textContent = lvl.text; lbl.style.color = lvl.color;
  });

  // ── Password change ───────────────────────────────────────────────────────────
  const pwForm   = main.querySelector('#pw-change-form');
  const pwBtn    = main.querySelector('#pw-save-btn');
  const pwText   = main.querySelector('#pw-save-text');
  const pwSpin   = main.querySelector('#pw-save-spin');
  const pwErr    = main.querySelector('#pw-error');
  const pwErrMsg = main.querySelector('#pw-error-msg');
  const pwOk     = main.querySelector('#pw-success');

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pwErr.classList.add('hidden');
    pwOk.classList.add('hidden');
    const current  = main.querySelector('#pw-current').value;
    const newPass  = main.querySelector('#pw-new').value;
    const confirm  = main.querySelector('#pw-confirm').value;

    if (newPass.length < 8)        { pwErrMsg.textContent = 'New password must be at least 8 characters.'; pwErr.classList.remove('hidden'); return; }
    if (!/[A-Z]/.test(newPass))    { pwErrMsg.textContent = 'New password must include at least one uppercase letter.'; pwErr.classList.remove('hidden'); return; }
    if (!/[0-9]/.test(newPass))    { pwErrMsg.textContent = 'New password must include at least one number.'; pwErr.classList.remove('hidden'); return; }
    if (newPass !== confirm)       { pwErrMsg.textContent = 'Passwords do not match.'; pwErr.classList.remove('hidden'); return; }

    pwBtn.disabled = true; pwText.classList.add('hidden'); pwSpin.classList.remove('hidden');
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(firebaseUser.email, current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPass);
      pwOk.classList.remove('hidden');
      pwForm.reset();
      main.querySelector('#pw-new-bar').style.width = '0%';
      main.querySelector('#pw-new-label').textContent = '';
      showToast('Password changed successfully! 🔐', 'success');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        pwErrMsg.textContent = 'Current password is incorrect.';
      } else if (code === 'auth/too-many-requests') {
        pwErrMsg.textContent = 'Too many attempts. Please wait a few minutes.';
      } else {
        pwErrMsg.textContent = err.message || 'Failed to update password.';
      }
      pwErr.classList.remove('hidden');
    } finally {
      pwBtn.disabled = false; pwText.classList.remove('hidden'); pwSpin.classList.add('hidden');
    }
  });
}
