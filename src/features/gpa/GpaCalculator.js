import { createLayout } from '../../components/layout/Sidebar.js';
import { appState, showToast } from '../../app/main.js';
import { db, collection, getDocs, addDoc, doc, deleteDoc, writeBatch, setDoc } from '../../lib/firebase.js';
import { logToolUsage } from '../../services/analytics-service.js';

// ── Grade System ──────────────────────────────────────────────────────────────
const GRADE_SYSTEM = [
  { grade: 'O',  points: 10, minMarks: 91 },
  { grade: 'A+', points: 9,  minMarks: 81 },
  { grade: 'A',  points: 8,  minMarks: 71 },
  { grade: 'B+', points: 7,  minMarks: 61 },
  { grade: 'B',  points: 6,  minMarks: 51 },
  { grade: 'C',  points: 5,  minMarks: 41 },
  { grade: 'U',  points: 0,  minMarks: 0  },
  { grade: 'SA', points: 0,  minMarks: 0  },
];
const VALID_GRADES = new Set(['O','A+','A','B+','B','C','U','SA']);

let semesters = {};
let currentSem = 1;

// ── Main Render ───────────────────────────────────────────────────────────────
export function render(root) {
  semesters = {};
  currentSem = 1;

  const layout = createLayout('GPA / CGPA', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <p class="text-muted text-body-sm">Anna University grade system — O, A+, A, B+, B, C, U</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 380px;align-items:start">

      <!-- Left panel -->
      <div class="flex flex-col gap-6">

        <!-- Semester selector + PDF upload -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-4" style="flex-wrap:wrap;gap:var(--space-3)">
            <h2 class="text-title">Semester</h2>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${[1,2,3,4,5,6,7,8].map(s => `
                <button class="chip sem-btn ${s===1?'active':''}" data-sem="${s}">S${s}</button>
              `).join('')}
            </div>
          </div>

          <!-- PDF Import -->
          <div class="glass-surface" style="margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);">
            <div>
              <div class="text-on-surface" style="font-weight:600;font-size:var(--font-body-sm)">Import Result PDF</div>
              <div class="text-muted text-label" style="margin-top:2px;">Auto-fill ALL subjects from Anna Univ / Autonomous results</div>
              <div class="text-primary text-label" style="margin-top:4px; font-weight: 500;"><i data-lucide="lightbulb" class="icon-inline"></i> How to use: Go to Camu → Final Result → Previous Semester → Download PDF → Upload here</div>
            </div>
            <div>
              <input type="file" id="gpa-pdf-upload" accept="application/pdf" style="display:none;" />
              <button class="btn btn-secondary btn-sm" id="gpa-pdf-btn"><i data-lucide="file-text" class="icon-inline"></i> Upload PDF</button>
            </div>
          </div>

          <!-- Parsed Preview Panel (hidden until PDF parsed) -->
          <div id="pdf-preview-panel" style="display:none;margin-bottom:var(--space-4);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
              <div style="font-weight:700;color:var(--color-primary)"><i data-lucide="clipboard-list" class="icon-inline"></i> Parsed Subjects — Review &amp; Edit</div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-ghost btn-sm" id="preview-add-row-btn">+ Add Row</button>
                <button class="btn btn-primary btn-sm" id="preview-save-btn"><i data-lucide="check-circle-2" class="icon-inline"></i> Save to Semester <span id="preview-sem-label">1</span></button>
              </div>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Subject Code</th><th>Subject Name</th><th>Grade</th><th>Credits</th><th></th></tr></thead>
                <tbody id="preview-tbody"></tbody>
              </table>
            </div>
            <!-- Warning message -->
            <div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);display:flex;gap:var(--space-3);align-items:flex-start">
              <span style="font-size:1.25rem;line-height:1"><i data-lucide="alert-triangle" class="icon-inline"></i>️</span>
              <div>
                <div style="font-weight:700;color:#f59e0b;font-size:var(--font-body-sm);margin-bottom:2px">Please double-check before saving!</div>
                <div style="font-size:var(--font-label);color:var(--text-muted);line-height:1.5">
                  The auto-parser may make mistakes — especially with long subject names that wrap across lines or unusual PDF formats.
                  <strong style="color:var(--text-on-surface)">Verify each subject name, grade, and credit</strong> before clicking Save.
                  You can edit any field directly in the table above, add missing subjects with <em>+ Add Row</em>, or delete incorrect ones with <em><i data-lucide="x" class="icon-inline"></i></em>.
                </div>
              </div>
            </div>
          </div>

          <!-- Manual Add Subject Form -->
          <form id="add-subject-gpa">
            <div class="grid gap-3" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end">
              <div class="form-group">
                <label class="form-label">Subject Name</label>
                <input class="form-input" id="gpa-subject" type="text" placeholder="e.g. CS3451 - Operating Systems" required />
              </div>
              <div class="form-group">
                <label class="form-label">Credits</label>
                <input class="form-input" id="gpa-credits" type="number" min="1" max="6" value="3" required />
              </div>
              <div class="form-group">
                <label class="form-label">Grade</label>
                <select class="form-select" id="gpa-grade">
                  ${GRADE_SYSTEM.filter(g=>g.grade!=='SA').map(g => `<option value="${g.grade}" data-pts="${g.points}">${g.grade} (${g.points})</option>`).join('')}
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="margin-bottom:2px">+ Add</button>
            </div>
          </form>
        </div>

        <!-- Subjects Table -->
        <div class="glass-card" id="sem-table-card" style="display:none">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-title">Semester <span id="sem-label">1</span> Subjects</h2>
            <span class="badge badge-primary" id="sem-gpa-badge">GPA: —</span>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Subject</th><th>Credits</th><th>Grade</th><th>Grade Points</th><th>Weighted</th><th></th></tr></thead>
              <tbody id="sem-tbody"></tbody>
              <tfoot>
                <tr style="background:var(--color-surface-container-high)">
                  <td colspan="2" style="font-weight:700">Total / GPA</td>
                  <td id="total-credits" style="font-weight:700">—</td>
                  <td colspan="2"></td>
                  <td id="sem-gpa-cell" style="font-weight:700;color:var(--color-primary)">—</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Target GPA Calculator -->
        <div class="glass-card">
          <h2 class="text-title mb-4"><i data-lucide="target" class="icon-inline"></i> Target Grade Calculator</h2>
          <p class="text-muted text-body-sm mb-4">What grade do you need? Enter your target GPA for a subject:</p>
          <div class="flex gap-3 items-center">
            <input class="form-input" id="target-gpa" type="number" min="0" max="10" step="0.1" placeholder="e.g. 8.5" style="max-width:140px" />
            <span class="text-muted">target GPA</span>
            <button class="btn btn-primary btn-sm" id="calc-target">Calculate</button>
          </div>
          <div id="target-result" class="mt-4"></div>
        </div>
      </div>

      <!-- Right panel: GPA Gauge + CGPA + History -->
      <div class="flex flex-col gap-4" style="position:sticky;top:80px">
        <div class="glass-card" style="text-align:center">
          <div class="text-label-sm text-muted mb-4">CURRENT SEMESTER GPA</div>
          <div class="circular-gauge" style="margin:0 auto var(--space-4)">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--bg-secondary)" stroke-width="8"/>
              <circle cx="80" cy="80" r="68" fill="none" stroke="url(#gaugeGrad)" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="${2*Math.PI*68}" stroke-dashoffset="${2*Math.PI*68}" id="gauge-circle"/>
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#4361ee"/>
                  <stop offset="100%" stop-color="#4cc9f0"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="gauge-value" style="background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="gauge-value">—</div>
          </div>
          <div class="text-body-sm text-muted">out of 10.0</div>
          <div style="margin-top:var(--space-2)">
            <span class="badge" id="grade-letter-badge" style="font-size:var(--font-body);padding:6px 16px">—</span>
          </div>
        </div>

        <div class="glass-card" style="text-align:center">
          <div class="text-label-sm text-muted mb-2">CUMULATIVE CGPA</div>
          <div style="font-size:2.5rem;font-weight:900;letter-spacing:-0.02em;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="cgpa-value">—</div>
          <div class="text-body-sm text-muted mt-1">Across all semesters</div>
        </div>

        <div class="glass-card">
          <h3 class="text-title mb-4 text-center"><i data-lucide="trending-up" class="icon-inline"></i> Semester History</h3>
          <div id="sem-history" class="flex flex-col gap-2">
            <div class="text-muted text-body-sm" style="text-align:center">Add subjects to see history</div>
          </div>
          <button class="btn btn-secondary btn-sm w-full mt-4" id="export-gpa-btn"><i data-lucide="download" class="icon-inline"></i> Export PDF</button>
        </div>
      </div>
    </div>
  `;

  // ── Semester buttons ────────────────────────────────────────────────────────
  main.querySelectorAll('.sem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSem = parseInt(btn.dataset.sem);
      renderSemesterTable(main, currentSem);
      main.querySelector('#preview-sem-label').textContent = currentSem;
    });
  });

  // ── Load from Firebase ──────────────────────────────────────────────────────
  async function loadData() {
    if (!appState.currentUser) {
      showToast('Please log in to save and sync your GPA', 'warning');
      return;
    }
    const tbody = main.querySelector('#sem-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Loading your subjects...</td></tr>';
    try {
      const snap = await getDocs(collection(db, 'users', appState.currentUser.uid, 'gpa'));
      semesters = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const sem = data.semester || 1;
        if (!semesters[sem]) semesters[sem] = [];
        semesters[sem].push({ id: d.id, ...data });
      });
      renderSemesterTable(main, currentSem);
      updateCGPA(main);
      
      // Log CGPA usage on successful load (if they have data)
      if (snap.size > 0) {
        logToolUsage('CGPA Calculator', 'viewed');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading GPA data', 'error');
    }
  }
  loadData();

  // ── Manual Add ──────────────────────────────────────────────────────────────
  main.querySelector('#add-subject-gpa').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!appState.currentUser) return showToast('Please log in first', 'error');
    const subject = main.querySelector('#gpa-subject').value.trim();
    const credits = parseInt(main.querySelector('#gpa-credits').value) || 3;
    const gradeEl = main.querySelector('#gpa-grade');
    const grade   = gradeEl.value;
    const points  = parseInt(gradeEl.options[gradeEl.selectedIndex].dataset.pts);
    if (!subject) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '...';
    try {
      const subjectData = { subject, credits, grade, points, semester: currentSem };
      const ref = await addDoc(collection(db, 'users', appState.currentUser.uid, 'gpa'), subjectData);
      if (!semesters[currentSem]) semesters[currentSem] = [];
      semesters[currentSem].push({ id: ref.id, ...subjectData });
      e.target.reset();
      main.querySelector('#gpa-credits').value = '3';
      renderSemesterTable(main, currentSem);
      updateCGPA(main);
      showToast(`${subject} added to Semester ${currentSem}`, 'success');
      logToolUsage('GPA Calculator', 'calculated manually');
    } catch (err) {
      console.error(err);
      showToast('Error saving subject', 'error');
    } finally {
      btn.disabled = false; btn.textContent = '+ Add';
    }
  });

  // ── PDF Upload ──────────────────────────────────────────────────────────────
  main.querySelector('#gpa-pdf-btn').addEventListener('click', () => {
    main.querySelector('#gpa-pdf-upload').click();
  });

  main.querySelector('#gpa-pdf-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!appState.currentUser) { showToast('Please log in first', 'error'); return; }

    const btn = main.querySelector('#gpa-pdf-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="hourglass" class="icon-inline"></i> Parsing...'; btn.disabled = true;

    try {
      const { pdfToText } = await import('../../services/timetable-ai.js');
      const rawText = await pdfToText(file);
      const parsed  = parsePDF(rawText);

      if (parsed.length === 0) {
        showToast('No subjects found in PDF. Try a different format.', 'warning');
      } else {
        showPreviewPanel(main, parsed);
        showToast(`Found ${parsed.length} subjects — review and click Save`, 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Error reading PDF', 'error');
    } finally {
      btn.innerHTML = orig; btn.disabled = false;
      e.target.value = '';
    }
  });

  // ── Preview: Add empty row ──────────────────────────────────────────────────
  main.querySelector('#preview-add-row-btn').addEventListener('click', () => {
    addPreviewRow(main, { code: '', name: '', grade: 'O', credits: 3 });
  });

  // ── Preview: Save to Firebase ───────────────────────────────────────────────
  main.querySelector('#preview-save-btn').addEventListener('click', async () => {
    if (!appState.currentUser) return showToast('Please log in first', 'error');
    const rows = collectPreviewRows(main);
    if (rows.length === 0) return showToast('No subjects to save', 'warning');

    const saveBtn = main.querySelector('#preview-save-btn');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...';

    try {
      const batch = writeBatch(db);
      const toAdd = [];
      rows.forEach(r => {
        const gradeInfo = GRADE_SYSTEM.find(g => g.grade === r.grade) || { points: 0 };
        const subject   = `${r.code} - ${r.name}`.trim().replace(/^-\s*|-\s*$/g,'').trim();
        const already   = (semesters[currentSem] || []).some(s => s.subject === subject);
        if (already) return;
        const ref  = doc(collection(db, 'users', appState.currentUser.uid, 'gpa'));
        const data = { subject, credits: r.credits, grade: r.grade, points: gradeInfo.points, semester: currentSem };
        batch.set(ref, data);
        toAdd.push({ id: ref.id, ...data });
      });

      if (toAdd.length === 0) {
        showToast('All subjects already exist in this semester', 'warning');
        saveBtn.disabled = false; saveBtn.innerHTML = `<i data-lucide="check-circle-2" class="icon-inline"></i> Save to Semester ${currentSem}`;
        return;
      }

      await batch.commit();
      if (!semesters[currentSem]) semesters[currentSem] = [];
      semesters[currentSem].push(...toAdd);

      main.querySelector('#pdf-preview-panel').style.display = 'none';
      renderSemesterTable(main, currentSem);
      updateCGPA(main);
      showToast(`${toAdd.length} subjects saved to Semester ${currentSem} <i data-lucide="check-circle-2" class="icon-inline"></i>`, 'success');
      logToolUsage('GPA Calculator', 'calculated from pdf');
    } catch (err) {
      console.error(err);
      showToast('Error saving to database', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i data-lucide="check-circle-2" class="icon-inline"></i> Save to Semester <span id="preview-sem-label">${currentSem}</span>`;
    }
  });

  // ── Target GPA ─────────────────────────────────────────────────────────────
  main.querySelector('#calc-target').addEventListener('click', () => {
    const target = parseFloat(main.querySelector('#target-gpa').value);
    const result = main.querySelector('#target-result');
    if (isNaN(target) || target < 0 || target > 10) {
      result.innerHTML = '<span class="text-danger">Enter a valid GPA between 0-10</span>'; return;
    }
    const minGrade = GRADE_SYSTEM.slice().reverse().find(g => g.points >= target);
    if (!minGrade) {
      result.innerHTML = '<span class="text-danger">GPA ≥10 is not achievable</span>'; return;
    }
    result.innerHTML = `
      <div class="alert alert-info"><span><i data-lucide="target" class="icon-inline"></i></span>
        <div>
          <div style="font-weight:700">For GPA ≥ ${target}</div>
          <div>You need at least grade <strong>${minGrade.grade}</strong> (${minGrade.points} points) — minimum marks: <strong>${minGrade.minMarks}/100</strong></div>
        </div>
      </div>`;
    
    logToolUsage('GPA Calculator', 'calculated target gpa');
  });

  main.querySelector('#export-gpa-btn').addEventListener('click', () => {
    showToast('GPA report export coming soon!', 'info');
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF PARSER -- Blob context-window strategy
//
// PDFs from Saveetha / Anna Univ are table-based. pdfjs extracts each
// table CELL as a separate line using Y-coordinates. So one result row:
//   SH4205 | Principles of Chemistry in Engineering | 6 | B | 4 | Pass
// becomes 6 separate lines. We collapse the whole PDF into one blob and
// search an 800-char window after each subject code.
function parsePDF(text) {
  const blob  = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(l=>l.trim()).filter(l=>l);

  console.log('[GPA] Blob (first 600):', blob.slice(0, 600));
  console.log('[GPA] Lines (first 25):', lines.slice(0, 25));

  const results = [];
  const seen    = new Set();

  // Strategy 1: Blob context window
  const codeRe = /\b([A-Z]{2,4}\d{3,6}[A-Z]?)\b/g;
  let m;
  while ((m = codeRe.exec(blob)) !== null) {
    const code = m[1].toUpperCase();
    if (seen.has(code)) continue;

    const win = blob.substring(m.index, m.index + 800);
    const gradeM  = win.match(/\b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA)(?!\w)/);
    const statusM = win.match(/\b(Pass|Fail|PASS|FAIL|Withdrawal)\b/i);
    if (!gradeM || !statusM) continue;

    let grade = gradeM[1].toUpperCase();
    if (grade === 'SA') grade = 'O';
    if (!VALID_GRADES.has(grade)) continue;

    // Credits: last standalone 1-6 before result status
    const beforeStatus = win.substring(0, win.toLowerCase().indexOf(statusM[0].toLowerCase()));
    const creditAll    = Array.from(beforeStatus.matchAll(/\b([1-6])\b/g));
    let credits = 3;
    if (creditAll.length > 0) credits = parseInt(creditAll[creditAll.length - 1][1], 10);

    // Subject name: between code end and first grade token
    let rawName = win
      .replace(/^[A-Z]{2,4}\d{3,6}[A-Z]?\s*[-]?\s*/i, '')
      .replace(/\b(ODD|EVEN|JUNIOR|SENIOR|FRESHMAN|SOPHOMORE)[\s-]*/gi, '')
      .replace(/\b\d{8,}\b/g, '')
      .split(/\b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA|Pass|Fail|PASS|FAIL)(?!\w)/)[0]
      .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
      .replace(/[-]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    rawName = rawName.replace(/^[\s,;:.]+|[\s,;:.]+$/, '');
    if (!rawName || rawName.length < 2) rawName = 'Subject';

    seen.add(code);
    results.push({ code, name: rawName, grade, credits });
  }
  console.log('[GPA] Strategy 1:', results.length, results);

  // Strategy 2: Line window (code appears at start of line)
  if (results.length === 0) {
    lines.forEach((line, idx) => {
      const cm = line.match(/\b([A-Z]{2,4}\d{3,6}[A-Z]?)\b/);
      if (!cm) return;
      const code = cm[1].toUpperCase();
      if (seen.has(code)) return;
      const ctx = lines.slice(idx, idx + 10).join(' ');
      const gm  = ctx.match(/\b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA)(?!\w)/);
      const sm  = ctx.match(/\b(Pass|Fail|PASS|FAIL)\b/i);
      if (!gm || !sm) return;
      let grade = gm[1].toUpperCase();
      if (grade === 'SA') grade = 'O';
      const cm2 = ctx.match(/\b([1-6])\b/);
      seen.add(code);
      const name = line.replace(cm[0],'').replace(/-/g,' ').trim() || 'Subject';
      results.push({ code, name, grade, credits: cm2 ? parseInt(cm2[1],10) : 3 });
    });
    console.log('[GPA] Strategy 2:', results.length);
  }

  return results;
}

function showPreviewPanel(main, parsed) {
  const panel = main.querySelector('#pdf-preview-panel');
  const tbody = main.querySelector('#preview-tbody');
  panel.style.display = '';
  main.querySelector('#preview-sem-label').textContent = currentSem;
  tbody.innerHTML = '';
  parsed.forEach(s => addPreviewRow(main, s));
}

function addPreviewRow(main, { code='', name='', grade='O', credits=3 } = {}) {
  const tbody = main.querySelector('#preview-tbody');
  const idx   = tbody.querySelectorAll('tr').length + 1;
  const tr    = document.createElement('tr');
  tr.innerHTML = `
    <td>${idx}</td>
    <td><input class="form-input preview-code" style="min-width:90px" value="${escHtml(code)}" placeholder="CS3451" /></td>
    <td><input class="form-input preview-name" style="min-width:180px" value="${escHtml(name)}" placeholder="Subject Name" /></td>
    <td>
      <select class="form-select preview-grade" style="min-width:80px">
        ${GRADE_SYSTEM.filter(g=>g.grade!=='SA').map(g =>
          `<option value="${g.grade}" ${g.grade===grade?'selected':''}>${g.grade}(${g.points})</option>`
        ).join('')}
      </select>
    </td>
    <td><input class="form-input preview-credits" type="number" min="1" max="6" value="${credits}" style="width:60px" /></td>
    <td><button class="btn btn-ghost btn-sm preview-del-btn" style="color:var(--color-danger)"><i data-lucide="x" class="icon-inline"></i></button></td>
  `;
  tr.querySelector('.preview-del-btn').addEventListener('click', () => {
    tr.remove();
    renumberPreview(main);
  });
  tbody.appendChild(tr);
}

function renumberPreview(main) {
  main.querySelectorAll('#preview-tbody tr').forEach((tr, i) => {
    tr.querySelector('td:first-child').textContent = i + 1;
  });
}

function collectPreviewRows(main) {
  return [...main.querySelectorAll('#preview-tbody tr')].map(tr => ({
    code:    tr.querySelector('.preview-code').value.trim().toUpperCase(),
    name:    tr.querySelector('.preview-name').value.trim(),
    grade:   tr.querySelector('.preview-grade').value,
    credits: parseInt(tr.querySelector('.preview-credits').value) || 3,
  })).filter(r => r.code || r.name);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Semester Table ────────────────────────────────────────────────────────────
function renderSemesterTable(main, semNum) {
  const card   = main.querySelector('#sem-table-card');
  const tbody  = main.querySelector('#sem-tbody');
  const label  = main.querySelector('#sem-label');
  label.textContent = semNum;
  const subjects = semesters[semNum] || [];

  if (subjects.length === 0) {
    card.style.display = 'none';
    // Reset gauge so it doesn't show the previous semester's GPA
    const circle     = main.querySelector('#gauge-circle');
    const gaugeValue = main.querySelector('#gauge-value');
    const gradeBadge = main.querySelector('#grade-letter-badge');
    const semBadge   = main.querySelector('#sem-gpa-badge');
    const circum     = 2 * Math.PI * 68;
    circle.style.strokeDashoffset = circum;          // empty ring
    circle.style.stroke = 'var(--color-surface-container-high)';
    gaugeValue.textContent = '—';
    gradeBadge.textContent = '—';
    gradeBadge.className   = 'badge badge-secondary';
    if (semBadge) semBadge.textContent = 'GPA: —';

  } else {
    card.style.display = '';
    let totalCredits = 0, totalWeighted = 0;
    tbody.innerHTML = subjects.map((s, i) => {
      const weighted = s.credits * s.points;
      totalCredits  += s.credits;
      totalWeighted += weighted;
      const gradeOptions = ['O','A+','A','B+','B','C','U']
        .map(g => `<option value="${g}" ${g===s.grade?'selected':''}>${g}</option>`).join('');
      return `
        <tr data-id="${s.id}" data-sem="${semNum}">
          <td>${i+1}</td>
          <td style="font-weight:600">
            <span class="gpa-view-mode">${escHtml(s.subject)}</span>
            <input class="form-input gpa-edit-mode" style="display:none;min-width:200px" value="${escHtml(s.subject)}" />
          </td>
          <td>
            <span class="gpa-view-mode">${s.credits}</span>
            <input class="form-input gpa-edit-mode" type="number" min="1" max="6" style="display:none;width:60px" value="${s.credits}" />
          </td>
          <td>
            <span class="badge badge-primary gpa-view-mode">${s.grade}</span>
            <select class="form-select gpa-edit-mode" style="display:none;min-width:80px">${gradeOptions}</select>
          </td>
          <td><span class="gpa-points-cell">${s.points}</span></td>
          <td style="color:var(--color-secondary);font-weight:600"><span class="gpa-weighted-cell">${weighted.toFixed(1)}</span></td>
          <td style="display:flex;gap:4px;align-items:center">
            <button class="btn btn-ghost btn-sm gpa-view-mode" onclick="editGPASubject('${s.id}',${semNum})" title="Edit"><i data-lucide="pencil" class="icon-inline"></i></button>
            <button class="btn btn-ghost btn-sm gpa-view-mode" onclick="removeGPASubject(${semNum},'${s.id}')" title="Delete"><i data-lucide="trash-2" class="icon-inline"></i></button>
            <button class="btn btn-primary btn-sm gpa-edit-mode" style="display:none" onclick="saveGPASubject('${s.id}',${semNum})"><i data-lucide="check-circle-2" class="icon-inline"></i></button>
            <button class="btn btn-ghost btn-sm gpa-edit-mode" style="display:none" onclick="cancelGPAEdit('${s.id}',${semNum})"><i data-lucide="x" class="icon-inline"></i></button>
          </td>
        </tr>`;
    }).join('');
    const gpa = totalCredits > 0 ? (totalWeighted / totalCredits) : 0;
    main.querySelector('#total-credits').textContent = totalCredits;
    main.querySelector('#sem-gpa-cell').textContent  = gpa.toFixed(2);
    main.querySelector('#sem-gpa-badge').textContent = `GPA: ${gpa.toFixed(2)}`;
    updateGauge(main, gpa);
  }
}

function updateGauge(main, gpa) {
  const circle      = main.querySelector('#gauge-circle');
  const gaugeValue  = main.querySelector('#gauge-value');
  const gradeBadge  = main.querySelector('#grade-letter-badge');
  const circum      = 2 * Math.PI * 68;
  // Restore color (may have been cleared by empty-semester reset)
  circle.style.stroke = gpa >= 8 ? '#22c55e' : gpa >= 6 ? '#f59e0b' : '#ef4444';
  circle.style.strokeDashoffset = circum - (gpa / 10) * circum;
  gaugeValue.textContent = gpa.toFixed(2);
  const auGrade = GRADE_SYSTEM.slice().reverse().find(g => gpa >= g.points - 0.5);
  gradeBadge.textContent = auGrade?.grade || '—';
  gradeBadge.className   = `badge badge-${gpa >= 8 ? 'success' : gpa >= 6 ? 'warning' : 'danger'}`;
}

function updateCGPA(main) {
  let totalCredits = 0, totalWeighted = 0, semHistory = [];
  Object.entries(semesters).sort((a,b) => a[0]-b[0]).forEach(([sem, subjects]) => {
    const tc  = subjects.reduce((s, r) => s + r.credits, 0);
    const tw  = subjects.reduce((s, r) => s + r.credits * r.points, 0);
    const gpa = tc > 0 ? (tw / tc) : 0;
    totalCredits  += tc;
    totalWeighted += tw;
    semHistory.push({ sem, gpa });
  });
  const cgpa = totalCredits > 0 ? (totalWeighted / totalCredits) : 0;
  main.querySelector('#cgpa-value').textContent = cgpa.toFixed(2);
  const histEl = main.querySelector('#sem-history');
  if (semHistory.length > 0) {
    histEl.innerHTML = semHistory.map(({ sem, gpa }) => `
      <div class="flex items-center justify-between" style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--color-surface-container-high)">
        <span class="text-body-sm" style="font-weight:600">Semester ${sem}</span>
        <div class="flex items-center gap-2">
          <div class="progress-bar" style="width:80px">
            <div class="progress-fill ${gpa>=8?'success':gpa>=6?'warning':'danger'}" style="width:${(gpa/10*100).toFixed(0)}%"></div>
          </div>
          <span class="text-body-sm" style="font-weight:700;color:var(--color-primary);min-width:36px;text-align:right">${gpa.toFixed(2)}</span>
        </div>
      </div>`).join('');
  }
}

// ── Global Delete ─────────────────────────────────────────────────────────────
window.removeGPASubject = async function(semNum, id) {
  if (!semesters[semNum] || !appState.currentUser) return;
  try {
    await deleteDoc(doc(db, 'users', appState.currentUser.uid, 'gpa', id));
    semesters[semNum] = semesters[semNum].filter(s => s.id !== id);
    const main = document.querySelector('#page-main');
    renderSemesterTable(main, semNum);
    updateCGPA(main);
    showToast('Subject removed', 'success');
  } catch (e) {
    console.error(e);
    showToast('Error removing subject', 'error');
  }
};

// ── Global Edit (toggle row into edit mode) ───────────────────────────────────
window.editGPASubject = function(id, semNum) {
  const tr = document.querySelector(`#page-main tr[data-id="${id}"]`);
  if (!tr) return;
  tr.querySelectorAll('.gpa-view-mode').forEach(el => el.style.display = 'none');
  tr.querySelectorAll('.gpa-edit-mode').forEach(el => el.style.display = '');
  tr.querySelector('input.gpa-edit-mode').focus();
};

// ── Global Cancel Edit ────────────────────────────────────────────────────────
window.cancelGPAEdit = function(id, semNum) {
  const main = document.querySelector('#page-main');
  renderSemesterTable(main, semNum);
  updateCGPA(main);
};

// ── Global Save Edit (updates Firebase + local state) ─────────────────────────
window.saveGPASubject = async function(id, semNum) {
  if (!appState.currentUser) return showToast('Please log in first', 'error');
  const tr = document.querySelector(`#page-main tr[data-id="${id}"]`);
  if (!tr) return;

  const inputs  = tr.querySelectorAll('input.gpa-edit-mode');
  const selects = tr.querySelectorAll('select.gpa-edit-mode');
  const subject = inputs[0].value.trim();
  const credits = parseInt(inputs[1].value) || 3;
  const grade   = selects[0].value;
  const gradeInfo = GRADE_SYSTEM.find(g => g.grade === grade) || { points: 0 };
  const points  = gradeInfo.points;

  if (!subject) return showToast('Subject name cannot be empty', 'warning');

  const saveBtn = tr.querySelector('button[onclick^="saveGPASubject"]');
  saveBtn.disabled = true; saveBtn.textContent = '...';

  try {
    await setDoc(
      doc(db, 'users', appState.currentUser.uid, 'gpa', id),
      { subject, credits, grade, points, semester: semNum },
      { merge: true }
    );

    // Update local state
    if (semesters[semNum]) {
      const idx = semesters[semNum].findIndex(s => s.id === id);
      if (idx !== -1) semesters[semNum][idx] = { id, subject, credits, grade, points, semester: semNum };
    }

    const main = document.querySelector('#page-main');
    renderSemesterTable(main, semNum);
    updateCGPA(main);
    showToast('Subject updated', 'success');
  } catch (e) {
    console.error(e);
    showToast('Error updating subject', 'error');
    saveBtn.disabled = false; saveBtn.innerHTML = '<i data-lucide="check-circle-2" class="icon-inline"></i>';
    showToast('Saved!', 'success');
  }
};
