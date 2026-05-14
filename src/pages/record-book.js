/**
 * Tool 5: AI Record Book PDF Maker — GitHub-Linked Lab Report Generator
 */
import { validateUsername, getUserRepos, defaultSubjectRepoMap } from '../services/github-service.js';
import { generateRecordBookPDF, downloadPDF } from '../utils/pdf-generator.js';
import { showToast } from '../components/toast.js';

export default async function renderRecordBook(container) {
  let step = 1;
  let githubUsername = '';
  let githubUser = null;
  let repos = [];
  let repoMap = defaultSubjectRepoMap.map(s => ({ ...s, found: false, repoUrl: '' }));
  let selectedExperiments = [];
  let isGenerating = false;

  function render() {
    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>AI Record Book PDF Maker</h1>
          <p class="subtitle">GitHub-linked lab report generator with QR codes</p>
        </div>

        <!-- Wizard Steps -->
        <div class="wizard-steps">
          ${[
            { num: 1, label: 'GitHub Account' },
            { num: 2, label: 'Repository Mapping' },
            { num: 3, label: 'Select Experiments' },
            { num: 4, label: 'Generate PDF' },
          ].map(s => `
            <div class="wizard-step ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}">
              <span class="step-number">${step > s.num ? '✓' : s.num}</span>
              <span class="step-label">${s.label}</span>
            </div>
          `).join('')}
        </div>

        <!-- Wizard Content -->
        <div class="wizard-content glass-card-static">
          ${renderStep()}
        </div>

        <!-- Navigation -->
        <div class="wizard-nav">
          ${step > 1 ? `<button class="btn btn-secondary" id="prev-step">← Back</button>` : '<div></div>'}
          ${step < 4 ? `<button class="btn btn-primary" id="next-step">Next →</button>` : ''}
          ${step === 4 ? `<button class="btn btn-primary" id="generate-pdf-btn" ${isGenerating ? 'disabled' : ''}>
            ${isGenerating ? '⏳ Generating...' : '📄 Generate PDF'}
          </button>` : ''}
        </div>
      </div>
    `;

    setupEvents();
  }

  function renderStep() {
    if (step === 1) {
      return `
        <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 1: Connect GitHub Account</h3>
        <p style="color:var(--on-surface-variant); margin-bottom:var(--space-lg);">Enter your GitHub username to validate and link your repositories.</p>
        <div class="github-input-group">
          <div class="form-group">
            <label>GitHub Username</label>
            <input type="text" id="github-username" placeholder="e.g. johndoe" value="${githubUsername}" />
          </div>
          <button class="btn btn-primary" id="validate-github-btn">Validate</button>
        </div>
        ${githubUser ? `
          <div class="validation-status valid" style="margin-top:var(--space-lg);">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${githubUser.avatar_url}" alt="avatar" style="width:40px;height:40px;border-radius:50%;" />
              <div>
                <strong style="color:var(--on-surface);">${githubUser.name || githubUser.login}</strong>
                <br /><span style="color:var(--outline);font-size:12px;">${repos.length} repositories found</span>
              </div>
            </div>
          </div>
        ` : ''}
      `;
    }

    if (step === 2) {
      return `
        <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 2: Subject-Repository Mapping</h3>
        <p style="color:var(--on-surface-variant); margin-bottom:var(--space-lg);">We've matched your repos to expected lab subjects. Green = found, Red = not found.</p>
        <div style="overflow-x:auto;">
          <table class="data-table repo-map-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Expected Repo</th>
                 <th>Status</th>
                 <th>Last Pushed</th>
                 <th>URL</th>
              </tr>
            </thead>
            <tbody>
              ${repoMap.map(m => `
                <tr>
                  <td style="color:var(--on-surface); font-weight:500;">${m.subject}</td>
                  <td><code style="background:var(--surface-container-highest); padding:2px 6px; border-radius:4px; font-size:12px;">${m.expectedRepo}</code></td>
                   <td class="${m.found ? 'status-found' : 'status-missing'}">
                     ${m.found ? '✅ Found' : '❌ Not Found'}
                   </td>
                   <td style="font-size:12px; color:var(--outline);">${m.pushedAt ? new Date(m.pushedAt).toLocaleDateString() : '—'}</td>
                   <td>${m.repoUrl ? `<a href="${m.repoUrl}" target="_blank" style="font-size:12px;">${m.repoUrl}</a>` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (step === 3) {
      const availableSubjects = repoMap.filter(m => m.found);
      return `
        <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 3: Select Experiments to Include</h3>
        <p style="color:var(--on-surface-variant); margin-bottom:var(--space-lg);">Choose which lab experiments to include in your PDF record book.</p>
        <div class="experiment-checklist">
          ${availableSubjects.length > 0 ? availableSubjects.map((m, i) => `
            <div class="experiment-check">
              <label>
                <input type="checkbox" class="exp-checkbox" data-idx="${i}" ${selectedExperiments.includes(i) ? 'checked' : ''} />
                <strong>${m.subject}</strong>
                <span style="color:var(--outline); font-size:12px;"> — ${m.expectedRepo}</span>
              </label>
            </div>
          `).join('') : `
            <div class="empty-state" style="padding:40px;">
              <div class="empty-icon">📁</div>
              <h3>No Repositories Found</h3>
              <p>Go back and check your GitHub username or manually create the expected repositories.</p>
            </div>
          `}
        </div>
        ${availableSubjects.length > 0 ? `
          <button class="btn btn-ghost btn-sm" id="select-all-btn" style="margin-top:12px;">Select All</button>
        ` : ''}
      `;
    }

    if (step === 4) {
      const selected = repoMap.filter((_, i) => selectedExperiments.includes(i));
      return `
        <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 4: Generate PDF</h3>
        <div class="pdf-preview">
          <div style="font-size:3rem; margin-bottom:16px;">📄</div>
          <h3 style="color:var(--on-surface); margin-bottom:8px;">Lab Record Book</h3>
          <p style="color:var(--on-surface-variant); margin-bottom:8px;">
            ${selected.length} experiment${selected.length !== 1 ? 's' : ''} selected
          </p>
          <p style="font-size:var(--text-label); color:var(--outline);">
            GitHub: @${githubUsername} • ${selected.map(s => s.subject).join(', ') || 'None'}
          </p>
          ${isGenerating ? `
            <div class="generate-progress" style="margin-top:24px;">
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width:70%; animation: pulse 1.5s infinite;"></div>
              </div>
              <p style="margin-top:8px; font-size:var(--text-body-sm); color:var(--primary);">Generating PDF...</p>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  function setupEvents() {
    // Validate GitHub
    document.getElementById('validate-github-btn')?.addEventListener('click', async () => {
      githubUsername = document.getElementById('github-username')?.value?.trim();
      if (!githubUsername) { showToast('Please enter a GitHub username', 'warning'); return; }

      showToast('Validating GitHub username...', 'info', 2000);
      const result = await validateUsername(githubUsername);
      if (result.valid) {
        githubUser = result.user;
        repos = await getUserRepos(githubUsername);
        // Match repos to expected names
        repoMap = defaultSubjectRepoMap.map(s => {
          const match = repos.find(r => r.name.toLowerCase() === s.expectedRepo.toLowerCase());
          return { ...s, found: !!match, repoUrl: match?.url || '', pushedAt: match?.pushedAt || '' };
        });
        showToast(`GitHub user verified! ${repos.length} repos found.`, 'success');
      } else {
        githubUser = null;
        repos = [];
        showToast('GitHub user not found', 'error');
      }
      render();
    });

    // Navigation
    document.getElementById('next-step')?.addEventListener('click', () => {
      if (step === 1 && !githubUser) { showToast('Please validate your GitHub username first', 'warning'); return; }
      step = Math.min(step + 1, 4);
      render();
    });

    document.getElementById('prev-step')?.addEventListener('click', () => {
      step = Math.max(step - 1, 1);
      render();
    });

    // Experiment checkboxes
    container.querySelectorAll('.exp-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx);
        if (cb.checked) selectedExperiments.push(idx);
        else selectedExperiments = selectedExperiments.filter(i => i !== idx);
      });
    });

    // Select all
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
      const available = repoMap.filter(m => m.found);
      selectedExperiments = available.map((_, i) => i);
      render();
    });

    // Generate PDF
    document.getElementById('generate-pdf-btn')?.addEventListener('click', async () => {
      isGenerating = true;
      render();

      try {
        const selected = repoMap.filter((_, i) => selectedExperiments.includes(i));
        const user = window.__currentUser;
        const doc = await generateRecordBookPDF({
          studentName: user?.displayName || 'Student',
          regNo: 'RA2211003010XXX',
          department: 'Computer Science & Engineering',
          semester: '6',
          experiments: selected.map(s => ({
            title: s.subject,
            aim: `To implement and understand the concepts of ${s.subject}`,
            repoUrl: s.repoUrl,
            date: s.pushedAt ? new Date(s.pushedAt).toLocaleDateString() : '—',
          })),
        });

        downloadPDF(doc, `Lab_Record_${githubUsername}.pdf`);
        showToast('PDF generated and downloaded!', 'success');
      } catch (err) {
        showToast('Failed to generate PDF: ' + err.message, 'error');
      }

      isGenerating = false;
      render();
    });
  }

  render();
}
