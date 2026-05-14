/**
 * Settings Page
 */
import { showToast } from '../components/toast.js';

export default async function renderSettings(container) {
  const user = window.__currentUser;
  const displayName = user?.displayName || 'Student';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  container.innerHTML = `
    <div class="animate-fade">
      <div class="page-header">
        <h1>Settings</h1>
        <p class="subtitle">Manage your account and preferences</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-xl);">
        <!-- Profile -->
        <div class="glass-card-static">
          <h3 class="section-title" style="margin-bottom:var(--space-lg);">Profile</h3>
          <div style="display:flex; align-items:center; gap:var(--space-lg); margin-bottom:var(--space-xl);">
            <div class="avatar avatar-lg" style="width:64px;height:64px;font-size:1.5rem;">${initials}</div>
            <div>
              <div style="font-weight:600; color:var(--on-surface); font-size:var(--text-title);">${displayName}</div>
              <div style="color:var(--on-surface-variant); font-size:var(--text-body-sm);">${email}</div>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Display Name</label>
            <input type="text" id="settings-name" value="${displayName}" />
          </div>
          <div class="form-row" style="margin-bottom:16px;">
            <div class="form-group">
              <label>Department</label>
              <div class="select-wrapper">
                <select id="settings-dept">
                  <option value="CSE" selected>CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">Mechanical</option>
                  <option value="IT">IT</option>
                  <option value="AIDS">AI & DS</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Semester</label>
              <div class="select-wrapper">
                <select id="settings-sem">
                  ${[1,2,3,4,5,6,7,8].map(s => `<option value="${s}" ${s === 6 ? 'selected' : ''}>Semester ${s}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <button class="btn btn-primary" id="save-profile-btn">Save Profile</button>
        </div>

        <!-- Preferences -->
        <div class="glass-card-static">
          <h3 class="section-title" style="margin-bottom:var(--space-lg);">Preferences</h3>
          <div style="display:flex; flex-direction:column; gap:var(--space-lg);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:500; color:var(--on-surface);">Exam Notifications</div>
                <div style="font-size:var(--text-body-sm); color:var(--outline);">Get reminded before exams</div>
              </div>
              <label class="toggle">
                <input type="checkbox" checked />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:500; color:var(--on-surface);">Attendance Alerts</div>
                <div style="font-size:var(--text-body-sm); color:var(--outline);">Alert when below 85%</div>
              </div>
              <label class="toggle">
                <input type="checkbox" checked />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:500; color:var(--on-surface);">Q&A Email Digest</div>
                <div style="font-size:var(--text-body-sm); color:var(--outline);">Weekly summary of new posts</div>
              </div>
              <label class="toggle">
                <input type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="divider"></div>

          <h3 class="section-title" style="margin-bottom:var(--space-md);">Danger Zone</h3>
          <button class="btn btn-danger btn-sm" id="clear-data-btn">Clear All Local Data</button>
        </div>
      </div>

      <!-- Firebase Config Info -->
      <div class="glass-card-static" style="margin-top:var(--space-xl);">
        <h3 class="section-title" style="margin-bottom:var(--space-md);">App Info</h3>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-lg); font-size:var(--text-body-sm);">
          <div><span style="color:var(--outline);">Version</span><br/><strong style="color:var(--on-surface);">1.0.0</strong></div>
          <div><span style="color:var(--outline);">Platform</span><br/><strong style="color:var(--on-surface);">SRM Productivity Hub</strong></div>
          <div><span style="color:var(--outline);">Last Updated</span><br/><strong style="color:var(--on-surface);">April 2026</strong></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    showToast('Profile saved!', 'success');
  });

  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure? This will clear all locally stored data.')) {
      localStorage.clear();
      showToast('Local data cleared', 'success');
    }
  });
}
