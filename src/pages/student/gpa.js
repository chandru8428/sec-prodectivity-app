import { createLayout } from '../../components/sidebar.js';
import { appState, showToast } from '../../main.js';
import { db, collection, query, where, getDocs, addDoc, doc, deleteDoc } from '/src/firebase.js';

// Anna University Grade System
const GRADE_SYSTEM = [
  { grade: 'O',  points: 10, minMarks: 91 },
  { grade: 'A+', points: 9,  minMarks: 81 },
  { grade: 'A',  points: 8,  minMarks: 71 },
  { grade: 'B+', points: 7,  minMarks: 61 },
  { grade: 'B',  points: 6,  minMarks: 51 },
  { grade: 'C',  points: 5,  minMarks: 41 },
  { grade: 'U',  points: 0,  minMarks: 0  },
];

let semesters = {};      // { semNum: [ { id, subject, credits, grade, points } ] }
let currentSem = null;

export function render(root) {
  semesters = {};
  currentSem = null;

  const layout = createLayout('GPA / CGPA', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">📊 GPA / CGPA Calculator</h1>

    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 380px;align-items:start">

      <!-- Left: Input -->
      <div class="flex flex-col gap-6">
        <!-- Semester selector -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-title">Semester</h2>
            <div class="flex gap-2">
              ${[1,2,3,4,5,6,7,8].map(s => `
                <button class="chip sem-btn ${s===1?'active':''}" data-sem="${s}">S${s}</button>
              `).join('')}
            </div>
          </div>


          <!-- Add Subject Form -->
          <form id="add-subject-gpa">
            <div class="grid gap-3" style="grid-template-columns:2fr 1fr 1fr auto;align-items:end">
              <div class="form-group">
                <label class="form-label">Subject Name</label>
                <input class="form-input" id="gpa-subject" type="text" placeholder="Compiler Design" required />
              </div>
              <div class="form-group">
                <label class="form-label">Credits</label>
                <input class="form-input" id="gpa-credits" type="number" min="1" max="5" value="3" required />
              </div>
              <div class="form-group">
                <label class="form-label">Grade</label>
                <select class="form-select" id="gpa-grade">
                  ${GRADE_SYSTEM.map(g => `<option value="${g.grade}" data-pts="${g.points}">${g.grade} (${g.points})</option>`).join('')}
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="margin-bottom:2px">+ Add</button>
            </div>
          </form>
        </div>

        <!-- Subjects Table per semester -->
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
          <h2 class="text-title mb-4">🎯 Target Grade Calculator</h2>
          <p class="text-muted text-body-sm mb-4">What grade do you need? Enter your target GPA for a subject:</p>
          <div class="flex gap-3 items-center">
            <input class="form-input" id="target-gpa" type="number" min="0" max="10" step="0.1" placeholder="e.g. 8.5" style="max-width:140px" />
            <span class="text-muted">target GPA</span>
            <button class="btn btn-primary btn-sm" id="calc-target">Calculate</button>
          </div>
          <div id="target-result" class="mt-4"></div>
        </div>
      </div>

      <!-- Right: GPA Gauge + History -->
      <div class="flex flex-col gap-4" style="position:sticky;top:80px">
        <!-- Current Semester GPA Gauge -->
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

        <!-- CGPA -->
        <div class="glass-card" style="text-align:center">
          <div class="text-label-sm text-muted mb-2">CUMULATIVE CGPA</div>
          <div style="font-size:2.5rem;font-weight:900;letter-spacing:-0.02em;background:var(--gradient-hero);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="cgpa-value">—</div>
          <div class="text-body-sm text-muted mt-1">Across all semesters</div>
        </div>

        <!-- Semester History -->
        <div class="glass-card">
          <h3 class="text-title mb-4 text-center">📈 Semester History</h3>
          <div id="sem-history" class="flex flex-col gap-2">
            <div class="text-muted text-body-sm" style="text-align:center">Add subjects to see history</div>
          </div>
          <button class="btn btn-secondary btn-sm w-full mt-4" id="export-gpa-btn">📥 Export PDF</button>
        </div>
      </div>
    </div>
  `;

  let activeSem = 1;

  // Semester button clicks
  main.querySelectorAll('.sem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSem = parseInt(btn.dataset.sem);
      currentSem = activeSem;
      renderSemesterTable(main, activeSem);
    });
  });

  activeSem = 1;
  currentSem = 1;

  // Add subject
  main.querySelector('#add-subject-gpa').addEventListener('submit', (e) => {
    e.preventDefault();
    const subject  = main.querySelector('#gpa-subject').value.trim();
    const credits  = parseInt(main.querySelector('#gpa-credits').value) || 3;
    const gradeEl  = main.querySelector('#gpa-grade');
    const grade    = gradeEl.value;
    const points   = parseInt(gradeEl.options[gradeEl.selectedIndex].dataset.pts);

    if (!subject) return;
    if (!semesters[currentSem]) semesters[currentSem] = [];
    semesters[currentSem].push({ id: Date.now(), subject, credits, grade, points });
    e.target.reset();
    main.querySelector('#gpa-credits').value = '3';
    renderSemesterTable(main, currentSem);
    updateCGPA(main);
    showToast(`${subject} added to Semester ${currentSem}`, 'success');
  });

  // Target GPA
  main.querySelector('#calc-target').addEventListener('click', () => {
    const target  = parseFloat(main.querySelector('#target-gpa').value);
    const result  = main.querySelector('#target-result');
    if (isNaN(target) || target < 0 || target > 10) {
      result.innerHTML = '<span class="text-danger">Enter a valid GPA between 0-10</span>';
      return;
    }
    const minGrade = GRADE_SYSTEM.find(g => g.points >= target);
    if (!minGrade) {
      result.innerHTML = '<span class="text-danger">GPA ≥10 is not achievable</span>';
      return;
    }
    result.innerHTML = `
      <div class="alert alert-info">
        <span>🎯</span>
        <div>
          <div style="font-weight:700">For GPA ≥ ${target}</div>
          <div>You need at least grade <strong>${minGrade.grade}</strong> (${minGrade.points} points) — minimum marks: <strong>${minGrade.minMarks}/100</strong></div>
        </div>
      </div>
    `;
  });

  // Export
  main.querySelector('#export-gpa-btn').addEventListener('click', () => {
    showToast('GPA report export coming soon!', 'info');
  });
}

function renderSemesterTable(main, semNum) {
  const card  = main.querySelector('#sem-table-card');
  const tbody = main.querySelector('#sem-tbody');
  const label = main.querySelector('#sem-label');

  label.textContent = semNum;
  const subjects = semesters[semNum] || [];

  if (subjects.length === 0) {
    card.style.display = 'none';
  } else {
    card.style.display = '';
    let totalCredits = 0, totalWeighted = 0;
    tbody.innerHTML = subjects.map((s, i) => {
      const weighted = s.credits * s.points;
      totalCredits  += s.credits;
      totalWeighted += weighted;
      return `
        <tr>
          <td>${i+1}</td>
          <td style="font-weight:600">${s.subject}</td>
          <td>${s.credits}</td>
          <td><span class="badge badge-primary">${s.grade}</span></td>
          <td>${s.points}</td>
          <td style="color:var(--color-secondary);font-weight:600">${weighted.toFixed(1)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="removeGPASubject(${semNum},${s.id})">🗑️</button></td>
        </tr>
      `;
    }).join('');

    const gpa = totalCredits > 0 ? (totalWeighted / totalCredits) : 0;
    main.querySelector('#total-credits').textContent = totalCredits;
    main.querySelector('#sem-gpa-cell').textContent  = gpa.toFixed(2);
    main.querySelector('#sem-gpa-badge').textContent = `GPA: ${gpa.toFixed(2)}`;

    updateGauge(main, gpa);
  }
}

function updateGauge(main, gpa) {
  const circle       = main.querySelector('#gauge-circle');
  const gaugeValue   = main.querySelector('#gauge-value');
  const gradeBadge   = main.querySelector('#grade-letter-badge');
  const circumference = 2 * Math.PI * 68;
  const offset       = circumference - (gpa / 10) * circumference;
  circle.style.strokeDashoffset = offset;
  gaugeValue.textContent = gpa.toFixed(2);

  // Grade letter
  const gradeInfo = GRADE_SYSTEM.find(g => gpa >= g.points - 0.5) || GRADE_SYSTEM[GRADE_SYSTEM.length - 1];
  const auGrade   = GRADE_SYSTEM.slice().reverse().find(g => gpa >= g.points - 0.5);
  gradeBadge.textContent = auGrade?.grade || '—';
  gradeBadge.className = `badge badge-${gpa >= 8 ? 'success' : gpa >= 6 ? 'warning' : 'danger'}`;
}

function updateCGPA(main) {
  let totalCredits = 0, totalWeighted = 0;
  let semHistory   = [];

  Object.entries(semesters).sort((a,b) => a[0]-b[0]).forEach(([sem, subjects]) => {
    const tc = subjects.reduce((s, r) => s + r.credits, 0);
    const tw = subjects.reduce((s, r) => s + r.credits * r.points, 0);
    const gpa = tc > 0 ? (tw / tc) : 0;
    totalCredits  += tc;
    totalWeighted += tw;
    semHistory.push({ sem, gpa });
  });

  const cgpa = totalCredits > 0 ? (totalWeighted / totalCredits) : 0;
  main.querySelector('#cgpa-value').textContent = cgpa.toFixed(2);

  // History
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
      </div>
    `).join('');
  }
}

window.removeGPASubject = function(semNum, id) {
  if (!semesters[semNum]) return;
  semesters[semNum] = semesters[semNum].filter(s => s.id !== id);
  renderSemesterTable(document.querySelector('#page-main'), semNum);
  updateCGPA(document.querySelector('#page-main'));
};
