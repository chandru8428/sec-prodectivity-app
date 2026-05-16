/**
 * Tool 5: AI Record Book PDF Maker — Manual + Auto-Generate Modes
 */
import {
  validateUsername, getUserRepos, defaultSubjectRepoMap,
  checkUrlLive, findBestMatchingRepo, validateAndFixMappingUrls, stringSimilarity
} from '../services/github-service.js';
import { generateRecordBookPDF, downloadPDF } from '../utils/pdf-generator.js';
import { showToast } from '../components/toast.js';
import { db, collection, getDocs } from '/src/supabase-adapter.js';

export default async function renderRecordBook(container) {
  /* ── state ── */
  let mode = null;           // 'manual' | 'auto'
  let step = 1;
  let githubUsername = '';
  let githubUser = null;
  let userRepos = [];
  let repoMappings = [];     // from DB (repoMappings collection)
  let selectedSubject = '';  // for auto mode
  let repoMap = [];          // working map for this session
  let selectedExperiments = [];
  let isGenerating = false;
  let isValidatingUrls = false;

  /* ── load DB mappings ── */
  async function loadDbMappings() {
    try {
      const snap = await getDocs(collection(db, 'repoMappings'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  }

  /* ── unique subjects from DB mappings ── */
  function getUniqueSubjects(mappings) {
    const seen = new Set();
    return mappings
      .filter(m => m.subjectName)
      .filter(m => { const k = m.subjectName.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(m => ({ code: m.subjectCode || '', name: m.subjectName }));
  }

  /* ── similarity helper (0-100) ── */
  function sim(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
    b = b.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
    if (a === b) return 100;
    // word overlap
    const wa = new Set(a.split(' ')); const wb = new Set(b.split(' '));
    let common = 0; for (const w of wa) if (wb.has(w)) common++;
    return Math.round((2 * common / (wa.size + wb.size)) * 100);
  }

  /* ── find best repo match from user repos (>= 85%) ── */
  function bestRepo(title, repos) {
    let best = null, bestScore = 0;
    for (const r of repos) {
      const s = Math.max(sim(title, r.name), r.description ? sim(title, r.description) : 0);
      if (s > bestScore) { bestScore = s; best = r; }
    }
    return bestScore >= 85 ? { repo: best, score: bestScore } : null;
  }

  /* ────────────────────────────── RENDER ────────────────────────────── */
  function render() {
    if (!mode) { renderModeSelect(); return; }
    renderWizard();
  }

  function renderModeSelect() {
    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>AI Record Book PDF Maker</h1>
          <p class="subtitle">GitHub-linked lab report generator with QR codes</p>
        </div>
        <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:40px;">
          <div class="glass-card mode-card" id="mode-manual" style="cursor:pointer;flex:1;min-width:260px;max-width:340px;text-align:center;padding:40px 32px;border:2px solid transparent;transition:border .2s,transform .2s">
            <div style="font-size:3rem;margin-bottom:16px;">✍️</div>
            <h2 style="color:var(--on-surface);margin-bottom:10px;">Manual Entry</h2>
            <p style="color:var(--on-surface-variant);font-size:14px;line-height:1.6;">
              Enter your GitHub username and manually browse your repositories to build a record book.
            </p>
            <button class="btn btn-primary" style="margin-top:24px;width:100%;">Choose Manual</button>
          </div>
          <div class="glass-card mode-card" id="mode-auto" style="cursor:pointer;flex:1;min-width:260px;max-width:340px;text-align:center;padding:40px 32px;border:2px solid transparent;transition:border .2s,transform .2s">
            <div style="font-size:3rem;margin-bottom:16px;">⚡</div>
            <h2 style="color:var(--on-surface);margin-bottom:10px;">Auto-Generate</h2>
            <p style="color:var(--on-surface-variant);font-size:14px;line-height:1.6;">
              Pick a subject from the admin repo mapping. AI finds & validates matching GitHub repos automatically.
            </p>
            <button class="btn btn-secondary" style="margin-top:24px;width:100%;">Choose Auto-Generate</button>
          </div>
        </div>
      </div>`;

    document.getElementById('mode-manual')?.addEventListener('click', () => { mode = 'manual'; step = 1; render(); });
    document.getElementById('mode-auto')?.addEventListener('click', async () => {
      mode = 'auto'; step = 1;
      showToast('Loading subject list from repo mapping…', 'info', 2000);
      repoMappings = await loadDbMappings();
      render();
    });
  }

  /* ── wizard shell ── */
  function renderWizard() {
    const steps = mode === 'auto'
      ? [{ num:1,label:'GitHub Account' }, { num:2,label:'Select Subject' }, { num:3,label:'Review & Fix URLs' }, { num:4,label:'Generate PDF' }]
      : [{ num:1,label:'GitHub Account' }, { num:2,label:'Repo Mapping' }, { num:3,label:'Select Experiments' }, { num:4,label:'Generate PDF' }];

    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header" style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-ghost btn-sm" id="back-to-mode" style="padding:6px 12px;">← Modes</button>
          <div>
            <h1>AI Record Book PDF Maker <span style="font-size:14px;font-weight:400;color:var(--primary);background:var(--primary-container);padding:2px 10px;border-radius:99px;margin-left:8px;">${mode === 'auto' ? '⚡ Auto' : '✍️ Manual'}</span></h1>
            <p class="subtitle">GitHub-linked lab report generator with QR codes</p>
          </div>
        </div>
        <div class="wizard-steps">
          ${steps.map(s => `
            <div class="wizard-step ${step===s.num?'active':step>s.num?'completed':''}">
              <span class="step-number">${step>s.num?'✓':s.num}</span>
              <span class="step-label">${s.label}</span>
            </div>`).join('')}
        </div>
        <div class="wizard-content glass-card-static">${renderStep()}</div>
        <div class="wizard-nav">
          ${step>1 ? `<button class="btn btn-secondary" id="prev-step">← Back</button>` : '<div></div>'}
          ${step<4 ? `<button class="btn btn-primary" id="next-step">Next →</button>` : ''}
          ${step===4 ? `<button class="btn btn-primary" id="generate-pdf-btn" ${isGenerating?'disabled':''}>
            ${isGenerating?'⏳ Generating…':'📄 Generate PDF'}</button>` : ''}
        </div>
      </div>`;

    document.getElementById('back-to-mode')?.addEventListener('click', () => { mode=null; step=1; repoMap=[]; selectedSubject=''; selectedExperiments=[]; render(); });
    setupEvents();
  }

  /* ── step content ── */
  function renderStep() {
    if (step === 1) return renderGithubStep();
    if (mode === 'auto') {
      if (step === 2) return renderAutoSubjectStep();
      if (step === 3) return renderAutoUrlReviewStep();
      if (step === 4) return renderGenerateStep();
    } else {
      if (step === 2) return renderManualRepoMapStep();
      if (step === 3) return renderManualSelectStep();
      if (step === 4) return renderGenerateStep();
    }
    return '';
  }

  /* Step 1 — GitHub account (shared) */
  function renderGithubStep() {
    return `
      <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 1: Connect GitHub Account</h3>
      <p style="color:var(--on-surface-variant);margin-bottom:var(--space-lg);">Enter your GitHub username to validate and link your repositories.</p>
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
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${githubUser.avatar_url}" alt="avatar" style="width:40px;height:40px;border-radius:50%;" />
            <div>
              <strong style="color:var(--on-surface);">${githubUser.name||githubUser.login}</strong>
              <br /><span style="color:var(--outline);font-size:12px;">${userRepos.length} repositories found</span>
            </div>
          </div>
        </div>` : ''}`;
  }

  /* Auto Step 2 — Subject dropdown + out-of-map search */
  function renderAutoSubjectStep() {
    const subjects = getUniqueSubjects(repoMappings);
    return `
      <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 2: Select Subject</h3>
      <p style="color:var(--on-surface-variant);margin-bottom:var(--space-lg);">
        Choose a subject from the admin repo mapping. If your subject isn't listed, type it below and AI will search your GitHub repos.
      </p>
      <div class="form-group" style="margin-bottom:16px;">
        <label>Subject from Repo Mapping</label>
        <select id="subject-select" class="form-input" style="width:100%;">
          <option value="">— Select a subject —</option>
          ${subjects.map(s => `<option value="${s.name}" ${selectedSubject===s.name?'selected':''}>${s.code ? s.code+' — ' : ''}${s.name}</option>`).join('')}
          <option value="__custom__">🔍 My subject is not listed…</option>
        </select>
      </div>
      <div id="custom-subject-row" style="display:${selectedSubject==='__custom__'||(!subjects.find(s=>s.name===selectedSubject)&&selectedSubject)?'block':'none'};margin-bottom:16px;">
        <div class="form-group">
          <label>Enter Subject Name</label>
          <input type="text" id="custom-subject-input" placeholder="e.g. Deep Learning Lab" value="${selectedSubject==='__custom__'?'':selectedSubject}" />
        </div>
        <div id="ai-search-hint" style="font-size:13px;color:var(--outline);margin-top:6px;">
          💡 AI will analyse your GitHub repos and match by name similarity (&gt;85%).
        </div>
      </div>
      ${selectedSubject && selectedSubject !== '__custom__' && subjects.find(s=>s.name===selectedSubject) ? `
        <div style="background:var(--surface-container);border-radius:8px;padding:12px;font-size:13px;color:var(--on-surface-variant);">
          ✅ <strong>${repoMappings.filter(m=>m.subjectName===selectedSubject).length}</strong> experiment(s) mapped for this subject in the admin database.
        </div>` : ''}`;
  }

  /* Auto Step 3 — URL review & fix */
  function renderAutoUrlReviewStep() {
    if (repoMap.length === 0) {
      return `<div class="empty-state" style="padding:40px;"><div class="empty-icon">📭</div><h3>No experiments loaded</h3><p>Go back and select a subject.</p></div>`;
    }
    return `
      <h3 class="section-title" style="margin-bottom:8px;">Step 3: Review & Fix URLs</h3>
      <p style="color:var(--on-surface-variant);margin-bottom:12px;">
        AI has validated each experiment's GitHub URL. Broken links are automatically fixed using &gt;85% title similarity matching.
      </p>
      ${isValidatingUrls ? `
        <div style="text-align:center;padding:40px;">
          <div class="progress-bar" style="margin:0 auto 12px;max-width:300px;"><div class="progress-bar-fill" style="width:60%;animation:pulse 1.5s infinite;"></div></div>
          <p style="color:var(--primary);">🤖 AI is analysing your repos…</p>
        </div>` : `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Exp</th><th>Subject</th><th>Title</th><th>URL Status</th><th>Final URL</th></tr></thead>
          <tbody>
            ${repoMap.map((m,i) => {
              const badge = m.fixStatus==='live'
                ? `<span style="color:#16a34a;font-weight:600;">✅ Live</span>`
                : m.fixStatus==='fixed'
                  ? `<span style="color:#d97706;font-weight:600;">🔧 Fixed (${m.fixScore}%)</span>`
                  : m.fixStatus==='missing'
                    ? `<span style="color:var(--outline);">— No URL</span>`
                    : `<span style="color:#dc2626;font-weight:600;">❌ Broken</span>`;
              const finalUrl = m.fixStatus==='fixed' ? m.fixedUrl : m.repoUrl;
              return `<tr>
                <td style="font-size:12px;">${m.expNo||'—'}</td>
                <td style="font-weight:600;font-size:12px;">${m.subjectName||m.subject||'—'}</td>
                <td style="font-size:12px;max-width:180px;">${m.title||'—'}</td>
                <td>${badge}</td>
                <td>${finalUrl ? `<a href="${finalUrl}" target="_blank" style="font-size:11px;color:var(--primary);">${finalUrl.replace('https://github.com/','')}</a>` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="revalidate-btn">🔄 Re-validate URLs</button>
        <span style="font-size:12px;color:var(--outline);align-self:center;">
          ${repoMap.filter(m=>m.fixStatus==='live').length} live · 
          ${repoMap.filter(m=>m.fixStatus==='fixed').length} auto-fixed · 
          ${repoMap.filter(m=>m.fixStatus==='broken').length} broken
        </span>
      </div>`}`;
  }

  /* Manual Step 2 — repo map table */
  function renderManualRepoMapStep() {
    return `
      <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 2: Subject-Repository Mapping</h3>
      <p style="color:var(--on-surface-variant);margin-bottom:var(--space-lg);">We've matched your repos to expected lab subjects. Green = found, Red = not found.</p>
      <div style="overflow-x:auto;">
        <table class="data-table repo-map-table">
          <thead><tr><th>Subject</th><th>Expected Repo</th><th>Status</th><th>Last Pushed</th><th>URL</th></tr></thead>
          <tbody>
            ${repoMap.map(m => `
              <tr>
                <td style="color:var(--on-surface);font-weight:500;">${m.subject}</td>
                <td><code style="background:var(--surface-container-highest);padding:2px 6px;border-radius:4px;font-size:12px;">${m.expectedRepo}</code></td>
                <td class="${m.found?'status-found':'status-missing'}">${m.found?'✅ Found':'❌ Not Found'}</td>
                <td style="font-size:12px;color:var(--outline);">${m.pushedAt?new Date(m.pushedAt).toLocaleDateString():'—'}</td>
                <td>${m.repoUrl?`<a href="${m.repoUrl}" target="_blank" style="font-size:12px;">${m.repoUrl}</a>`:'—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* Manual Step 3 — select experiments */
  function renderManualSelectStep() {
    const available = repoMap.filter(m => m.found);
    return `
      <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 3: Select Experiments</h3>
      <p style="color:var(--on-surface-variant);margin-bottom:var(--space-lg);">Choose which lab experiments to include in your PDF record book.</p>
      <div class="experiment-checklist">
        ${available.length>0 ? available.map((m,i) => `
          <div class="experiment-check">
            <label>
              <input type="checkbox" class="exp-checkbox" data-idx="${i}" ${selectedExperiments.includes(i)?'checked':''} />
              <strong>${m.subject}</strong>
              <span style="color:var(--outline);font-size:12px;"> — ${m.expectedRepo}</span>
            </label>
          </div>`).join('') : `
          <div class="empty-state" style="padding:40px;">
            <div class="empty-icon">📁</div>
            <h3>No Repositories Found</h3>
            <p>Go back and check your GitHub username or create the expected repositories.</p>
          </div>`}
      </div>
      ${available.length>0 ? `<button class="btn btn-ghost btn-sm" id="select-all-btn" style="margin-top:12px;">Select All</button>` : ''}`;
  }

  /* Step 4 — generate */
  function renderGenerateStep() {
    const selected = mode==='auto' ? repoMap : repoMap.filter((_,i)=>selectedExperiments.includes(i));
    return `
      <h3 class="section-title" style="margin-bottom:var(--space-lg);">Step 4: Generate PDF</h3>
      <div class="pdf-preview">
        <div style="font-size:3rem;margin-bottom:16px;">📄</div>
        <h3 style="color:var(--on-surface);margin-bottom:8px;">Lab Record Book</h3>
        <p style="color:var(--on-surface-variant);margin-bottom:8px;">${selected.length} experiment${selected.length!==1?'s':''} selected</p>
        <p style="font-size:var(--text-label);color:var(--outline);">
          GitHub: @${githubUsername} · ${mode==='auto'?selectedSubject:selected.map(s=>s.subject).join(', ')||'None'}
        </p>
        ${isGenerating ? `
          <div class="generate-progress" style="margin-top:24px;">
            <div class="progress-bar"><div class="progress-bar-fill" style="width:70%;animation:pulse 1.5s infinite;"></div></div>
            <p style="margin-top:8px;font-size:var(--text-body-sm);color:var(--primary);">Generating PDF…</p>
          </div>` : ''}
      </div>`;
  }

  /* ────────────────────────────── EVENTS ────────────────────────────── */
  function setupEvents() {
    /* Validate GitHub */
    document.getElementById('validate-github-btn')?.addEventListener('click', async () => {
      githubUsername = document.getElementById('github-username')?.value?.trim();
      if (!githubUsername) { showToast('Please enter a GitHub username', 'warning'); return; }
      showToast('Validating…', 'info', 2000);
      const result = await validateUsername(githubUsername);
      if (result.valid) {
        githubUser = result.user;
        userRepos = await getUserRepos(githubUsername);
        if (mode === 'manual') {
          repoMap = defaultSubjectRepoMap.map(s => {
            const match = userRepos.find(r => r.name.toLowerCase()===s.expectedRepo.toLowerCase());
            return { ...s, found:!!match, repoUrl:match?.url||'', pushedAt:match?.pushedAt||'' };
          });
        }
        showToast(`Verified! ${userRepos.length} repos found.`, 'success');
      } else {
        githubUser = null; userRepos = [];
        showToast('GitHub user not found', 'error');
      }
      renderWizard();
    });

    /* Navigation */
    document.getElementById('next-step')?.addEventListener('click', async () => {
      if (step===1 && !githubUser) { showToast('Please validate GitHub username first', 'warning'); return; }

      if (mode==='auto' && step===2) {
        // resolve subject selection
        const sel = document.getElementById('subject-select')?.value;
        const customInput = document.getElementById('custom-subject-input')?.value?.trim();

        let finalSubject = sel==='__custom__' ? customInput : sel;
        if (!finalSubject) { showToast('Please select or enter a subject', 'warning'); return; }

        selectedSubject = finalSubject;
        const inMap = repoMappings.filter(m => m.subjectName?.toLowerCase()===finalSubject.toLowerCase());

        if (inMap.length > 0) {
          // Subject is in repo mapping — use those experiments
          repoMap = inMap.map(m => ({ ...m, fixStatus: 'pending' }));
        } else {
          // Out-of-map — AI search user repos by similarity
          showToast(`"${finalSubject}" not in mapping — AI searching your repos…`, 'info', 3000);
          const matched = userRepos
            .map(r => ({ repo:r, score: Math.max(
              sim(finalSubject, r.name),
              r.description ? sim(finalSubject, r.description) : 0
            )}))
            .filter(x => x.score >= 40)
            .sort((a,b) => b.score-a.score)
            .slice(0, 10);

          if (matched.length === 0) {
            showToast('No matching repos found for that subject', 'warning');
            return;
          }
          repoMap = matched.map((x, i) => ({
            subjectName: finalSubject,
            expNo: String(i+1).padStart(2,'0'),
            title: x.repo.name,
            repoUrl: x.repo.url,
            pushedAt: x.repo.pushedAt,
            fixStatus: 'pending',
            aiMatched: true,
            matchScore: x.score,
          }));
          showToast(`AI matched ${repoMap.length} repos (name/description similarity)`, 'success');
        }

        // Move to step 3 and validate URLs
        step = 3;
        isValidatingUrls = true;
        renderWizard();
        await runUrlValidation();
        return;
      }

      step = Math.min(step+1, 4);
      renderWizard();
    });

    document.getElementById('prev-step')?.addEventListener('click', () => {
      step = Math.max(step-1, 1);
      renderWizard();
    });

    /* Subject select change */
    document.getElementById('subject-select')?.addEventListener('change', e => {
      selectedSubject = e.target.value;
      const customRow = document.getElementById('custom-subject-row');
      if (customRow) customRow.style.display = e.target.value==='__custom__' ? 'block' : 'none';
    });

    /* Re-validate button */
    document.getElementById('revalidate-btn')?.addEventListener('click', async () => {
      isValidatingUrls = true;
      renderWizard();
      await runUrlValidation();
    });

    /* Manual checkboxes */
    container.querySelectorAll('.exp-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx);
        if (cb.checked) selectedExperiments.push(idx);
        else selectedExperiments = selectedExperiments.filter(i => i!==idx);
      });
    });

    document.getElementById('select-all-btn')?.addEventListener('click', () => {
      const available = repoMap.filter(m => m.found);
      selectedExperiments = available.map((_,i) => i);
      renderWizard();
    });

    /* Generate PDF */
    document.getElementById('generate-pdf-btn')?.addEventListener('click', async () => {
      isGenerating = true;
      renderWizard();
      try {
        const selected = mode==='auto'
          ? repoMap.map(m => ({
              title: m.subjectName||m.subject||m.title||'Lab',
              aim: `To implement and understand ${m.title||m.subjectName}`,
              repoUrl: m.fixStatus==='fixed' ? m.fixedUrl : m.repoUrl,
              date: m.date || (m.pushedAt ? new Date(m.pushedAt).toLocaleDateString() : '—'),
            }))
          : repoMap.filter((_,i)=>selectedExperiments.includes(i)).map(s => ({
              title: s.subject,
              aim: `To implement and understand the concepts of ${s.subject}`,
              repoUrl: s.repoUrl,
              date: s.pushedAt ? new Date(s.pushedAt).toLocaleDateString() : '—',
            }));

        const user = window.__currentUser;
        const doc = await generateRecordBookPDF({
          studentName: user?.displayName || 'Student',
          regNo: 'RA2211003010XXX',
          department: 'Computer Science & Engineering',
          semester: '6',
          experiments: selected,
        });
        downloadPDF(doc, `Lab_Record_${githubUsername}.pdf`);
        showToast('PDF generated and downloaded!', 'success');
      } catch (err) {
        showToast('Failed to generate PDF: ' + err.message, 'error');
      }
      isGenerating = false;
      renderWizard();
    });
  }

  /* ── URL validation runner ── */
  async function runUrlValidation() {
    const updated = await Promise.all(repoMap.map(async m => {
      const copy = { ...m };
      if (!m.repoUrl) { copy.fixStatus = 'missing'; return copy; }
      const live = await checkUrlLive(m.repoUrl);
      if (live) { copy.fixStatus = 'live'; return copy; }

      // Dead URL — find best repo match by experiment title / subject name
      const searchTitle = m.title || m.subjectName || m.subject || '';
      const match = bestRepo(searchTitle, userRepos);
      if (match) {
        copy.fixStatus = 'fixed';
        copy.fixedUrl = match.repo.url;
        copy.fixScore = match.score;
      } else {
        copy.fixStatus = 'broken';
      }
      return copy;
    }));

    repoMap = updated;
    isValidatingUrls = false;
    renderWizard();

    const fixed = updated.filter(m=>m.fixStatus==='fixed').length;
    const broken = updated.filter(m=>m.fixStatus==='broken').length;
    if (fixed > 0) showToast(`🔧 Auto-fixed ${fixed} broken URL${fixed>1?'s':''}`, 'success');
    if (broken > 0) showToast(`⚠️ ${broken} URL${broken>1?'s':''} could not be matched`, 'warning');
  }

  /* ── init ── */
  render();
}
