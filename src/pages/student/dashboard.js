import { createLayout } from '../../components/sidebar.js';
import { appState } from '../../main.js';
import { db, collection, query, where, getDocs } from '/src/firebase.js';
import {
  db as supabaseDb,
  collection as sbCollection,
  query as sbQuery,
  where as sbWhere,
  getDocs as sbGetDocs,
} from '/src/supabase-adapter.js';
import { router } from '../../router.js';

let countdownIntervals = [];

export function render(root) {
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  const user = appState.userData;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] || 'Student';

  const layout = createLayout('Dashboard', '');
  root.appendChild(layout);

  const main = layout.querySelector('#page-main');
  main.innerHTML = `
    <!-- Greeting -->
    <div style="margin-bottom:var(--space-8)">
      <h1 class="text-display" id="greeting" style="color:var(--accent-primary);font-size:2rem;font-weight:800;margin-bottom:var(--space-2)">
        ${greeting}, ${firstName} 👋
      </h1>
      <div class="flex items-center gap-3">
        <span class="badge badge-secondary">${user?.department || 'CSE'}</span>
        <span class="badge badge-primary">Semester ${user?.semester || '—'}</span>
        <span style="font-size:var(--font-body-sm);color:var(--color-on-surface-variant)">${user?.registerNumber || ''}</span>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-4 gap-4 mb-8" id="stat-cards">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(67,97,238,0.1)">📅</div>
        <div class="stat-value" id="stat-exams">—</div>
        <div class="stat-label">Upcoming Exams</div>
        <div class="stat-change text-primary">Next in <span id="stat-next-days">—</span> days</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(91,213,252,0.1)">📊</div>
        <div class="stat-value" id="stat-gpa">—</div>
        <div class="stat-label">Current GPA</div>
        <div class="stat-change text-success">Anna University Scale</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(74,222,128,0.1)">✅</div>
        <div class="stat-value" id="stat-attendance">—</div>
        <div class="stat-label">Attendance</div>
        <div class="stat-change" id="stat-attendance-msg">Loading...</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(255,182,146,0.1)">💬</div>
        <div class="stat-value" id="stat-posts">—</div>
        <div class="stat-label">Q&A Posts</div>
        <div class="stat-change text-secondary">Your contributions</div>
      </div>
    </div>

    <!-- Hero Exam + Main Grid -->
    <div class="grid gap-6" style="grid-template-columns:1fr 360px">

      <!-- Left: Hero Exam + Exam List -->
      <div class="flex flex-col gap-6">
        <!-- Hero countdown -->
        <div class="hero-exam-card" id="hero-exam">
          <div style="margin-bottom:var(--space-4)">
            <span class="badge-next-exam" style="margin-bottom:var(--space-3)">⏰ NEXT EXAM</span>
            <h2 style="font-size:1.5rem;font-weight:800;color:#A86E11;margin-bottom:var(--space-2)" id="hero-subject">Loading...</h2>
            <div class="flex items-center gap-4" style="color:#A86E11;font-size:var(--font-body-sm)" id="hero-meta">
              <span>📅 —</span><span>🕐 —</span><span>🏛️ —</span>
            </div>
          </div>
          <div class="countdown" id="hero-countdown">
            <div class="countdown-unit">
              <div class="countdown-value hero" id="cd-days">00</div>
              <div class="countdown-label">Days</div>
            </div>
            <div class="countdown-sep">:</div>
            <div class="countdown-unit">
              <div class="countdown-value hero" id="cd-hours">00</div>
              <div class="countdown-label">Hours</div>
            </div>
            <div class="countdown-sep">:</div>
            <div class="countdown-unit">
              <div class="countdown-value hero" id="cd-mins">00</div>
              <div class="countdown-label">Mins</div>
            </div>
            <div class="countdown-sep">:</div>
            <div class="countdown-unit">
              <div class="countdown-value hero" id="cd-secs">00</div>
              <div class="countdown-label">Secs</div>
            </div>
          </div>
        </div>

        <!-- Upcoming exams list -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-title">📋 Upcoming Exams</h2>
            <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/student/timetable'">View All</button>
          </div>
          <div id="exam-list" class="flex flex-col gap-3">
            <div class="skeleton" style="height:80px;border-radius:var(--radius-lg)"></div>
            <div class="skeleton" style="height:80px;border-radius:var(--radius-lg)"></div>
            <div class="skeleton" style="height:80px;border-radius:var(--radius-lg)"></div>
          </div>
        </div>
      </div>

      <!-- Right: Quick Actions + Attendance warning -->
      <div class="flex flex-col gap-4">
        <h2 class="text-title">⚡ Quick Actions</h2>
        ${[
          { icon:'🗓️', label:'AI Schedule Crafter', desc:'Auto-generate conflict-free schedule', path:'/student/timetable-maker', color:'rgba(67,97,238,0.15)', border:'rgba(67,97,238,0.3)' },
          { icon:'📄', label:'Record Book Forge', desc:'Generate with GitHub + QR codes', path:'/student/record-book', color:'rgba(91,213,252,0.1)', border:'rgba(91,213,252,0.25)' },
          { icon:'✅', label:'Attendance Calculator', desc:'Track your 85% mandate', path:'/student/attendance', color:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)' },
          { icon:'📊', label:'CGPA / GPA', desc:'Anna University grading system', path:'/student/gpa', color:'rgba(255,182,146,0.1)', border:'rgba(255,182,146,0.25)' },
          { icon:'💬', label:'Knowledge Exchange', desc:'Post questions and tips', path:'/student/qa-board', color:'rgba(186,67,255,0.1)', border:'rgba(186,67,255,0.25)' },
        ].map(a => `
          <button class="flex items-center gap-4 w-full text-left quick-action-card" style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:var(--space-4);cursor:pointer;transition:all 0.2s ease;outline:none" data-path="${a.path}" onclick="window.location.hash='#${a.path}'">
            <div style="font-size:28px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${a.icon}</div>
            <div>
              <div style="font-size:var(--font-body-sm);font-weight:700;color:var(--color-on-surface)">${a.label}</div>
              <div style="font-size:11px;color:var(--color-on-surface-variant);margin-top:2px">${a.desc}</div>
            </div>
            <span style="margin-left:auto;color:var(--accent-primary)">›</span>
          </button>
        `).join('')}

        <!-- Attendance Warning (shown if < 85%) -->
        <div id="attendance-warning" class="alert alert-warning hidden" style="margin-top:var(--space-2)">
          <span>⚠️</span>
          <div>
            <div style="font-weight:700;margin-bottom:2px">Attendance Alert</div>
            <div id="attendance-warning-msg" style="font-size:var(--font-body-sm)">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadDashboardData(main);
}

async function loadDashboardData(main) {
  const user = appState.userData;
  if (!user?.registerNumber) {
    renderNoExams(main);
    return;
  }

  try {
    // Load exams — simple where only, sort client-side to avoid composite index
    const today = new Date().toISOString().split('T')[0];
    const examsRef = sbCollection(supabaseDb, 'examSchedules');
    const q = sbQuery(examsRef, sbWhere('registerNumber', '==', user.registerNumber));
    const snap = await sbGetDocs(q);
    const exams = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.examDate >= today)
      .sort((a, b) => a.examDate.localeCompare(b.examDate))
      .slice(0, 5);

    // Update stat
    main.querySelector('#stat-exams').textContent = exams.length;

    if (exams.length > 0) {
      const next = exams[0];
      const diff = Math.ceil((new Date(next.examDate) - new Date()) / 86400000);
      main.querySelector('#stat-next-days').textContent = diff;
      renderHeroExam(main, next);
      startCountdown(main, next);
    } else {
      main.querySelector('#hero-exam').innerHTML = `
        <div style="text-align:center;padding:var(--space-8)">
          <div style="font-size:48px;margin-bottom:var(--space-3)">🎉</div>
          <h2 class="text-title" style="color:var(--color-secondary)">No upcoming exams!</h2>
          <p class="text-muted text-body-sm" style="margin-top:var(--space-2)">Enjoy your time — or study ahead 📚</p>
        </div>
      `;
      main.querySelector('#stat-next-days').textContent = '∞';
    }

    renderExamList(main.querySelector('#exam-list'), exams);

  } catch (err) {
    console.warn('Exam load error:', err);
    renderNoExams(main);
  }

  // Load GPA
  try {
    const gpaSnap = await getDocs(query(collection(db, 'gpaRecords'),
      where('studentId', '==', appState.currentUser?.uid)
    ));
    if (!gpaSnap.empty) {
      // Sort client-side by semester desc
      const sorted = gpaSnap.docs.map(d => d.data()).sort((a,b) => (b.semester||0) - (a.semester||0));
      main.querySelector('#stat-gpa').textContent = sorted[0]?.gpa?.toFixed(2) || '—';
    } else {
      main.querySelector('#stat-gpa').textContent = '—';
    }
  } catch { main.querySelector('#stat-gpa').textContent = '—'; }

  // Load attendance
  try {
    const attSnap = await getDocs(query(collection(db, 'attendance'),
      where('studentId', '==', appState.currentUser?.uid)
    ));
    const records = attSnap.docs.map(d => d.data());
    if (records.length > 0) {
      const totalAttended = records.reduce((s, r) => s + (r.attended || 0), 0);
      const totalClasses  = records.reduce((s, r) => s + (r.total || 0), 0);
      const pct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
      main.querySelector('#stat-attendance').textContent = pct + '%';
      const attMsg = main.querySelector('#stat-attendance-msg');
      if (pct < 75) {
        attMsg.className = 'stat-change text-danger';
        attMsg.textContent = '⚠️ Critical — below 75%';
        main.querySelector('#attendance-warning').classList.remove('hidden');
        main.querySelector('#attendance-warning-msg').textContent = `Your attendance is ${pct}%. Attend all remaining classes immediately.`;
      } else if (pct < 85) {
        attMsg.className = 'stat-change text-warning';
        attMsg.textContent = '⚠️ Below 85% mandate';
        main.querySelector('#attendance-warning').classList.remove('hidden');
        main.querySelector('#attendance-warning-msg').textContent = `Your attendance is ${pct}% — below the 85% mandate. Please attend classes.`;
      } else {
        attMsg.className = 'stat-change text-success';
        attMsg.textContent = '✓ Above 85% mandate';
      }
    } else {
      main.querySelector('#stat-attendance').textContent = 'N/A';
      main.querySelector('#stat-attendance-msg').textContent = 'No data yet';
    }
  } catch { main.querySelector('#stat-attendance').textContent = '—'; }

  // Posts count
  try {
    const postsSnap = await getDocs(query(collection(db, 'posts'),
      where('userId', '==', appState.currentUser?.uid)
    ));
    main.querySelector('#stat-posts').textContent = postsSnap.size;
  } catch { main.querySelector('#stat-posts').textContent = '0'; }
}

function renderHeroExam(main, exam) {
  main.querySelector('#hero-subject').textContent = exam.subject;
  main.querySelector('#hero-meta').innerHTML = `
    <span>📅 ${formatDate(exam.examDate)}</span>
    <span>🕐 ${exam.startTime || '—'}</span>
    <span>🏛️ Hall ${exam.hall || '—'}</span>
  `;
}

function startCountdown(main, exam) {
  function tick() {
    const target = new Date(`${exam.examDate}T${exam.startTime || '09:00'}:00`);
    const now    = new Date();
    const diff   = target - now;

    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        const el = main.querySelector('#' + id);
        if (el) el.textContent = '00';
      });
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);

    const set = (id, val) => {
      const el = main.querySelector('#' + id);
      if (el) el.textContent = String(val).padStart(2, '0');
    };
    set('cd-days', days);
    set('cd-hours', hours);
    set('cd-mins', mins);
    set('cd-secs', secs);
  }
  tick();
  const id = setInterval(tick, 1000);
  countdownIntervals.push(id);
}

function renderExamList(container, exams) {
  if (exams.length === 0) {
    container.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center;padding:var(--space-6)">No upcoming exams found. Ask admin to upload timetable.</div>';
    return;
  }
  container.innerHTML = exams.map((exam, i) => `
    <div class="exam-card" style="${i === 0 ? 'border-color:rgba(67,97,238,0.3)' : ''}">
      <div class="flex items-center justify-between">
        <div>
          <div class="exam-subject">${exam.subject}</div>
          <div class="exam-meta">
            <div class="exam-meta-item">📅 ${formatDate(exam.examDate)}</div>
            <div class="exam-meta-item">🕐 ${exam.startTime || 'TBA'} – ${exam.endTime || 'TBA'}</div>
            ${exam.hall ? `<div class="exam-meta-item">🏛️ Hall ${exam.hall}</div>` : ''}
          </div>
        </div>
        <div class="text-right">
          ${getDaysChip(exam.examDate)}
        </div>
      </div>
    </div>
  `).join('');
}

function getDaysChip(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff <= 0) return '<span class="badge badge-danger">Today!</span>';
  if (diff === 1) return '<span class="badge badge-warning">Tomorrow!</span>';
  if (diff <= 3) return `<span class="badge badge-warning">${diff} days</span>`;
  return `<span class="badge badge-primary">${diff} days</span>`;
}

function renderNoExams(main) {
  main.querySelector('#stat-exams').textContent = '0';
  main.querySelector('#stat-next-days').textContent = '∞';
  const heroExam = main.querySelector('#hero-exam');
  if (heroExam) {
    heroExam.innerHTML = `
      <div style="text-align:center;padding:var(--space-8)">
        <div style="font-size:48px;margin-bottom:var(--space-3)">📚</div>
        <h2 class="text-title">No Exams Uploaded Yet</h2>
        <p class="text-muted" style="margin-top:var(--space-2)">Ask your admin to upload the exam timetable.</p>
      </div>
    `;
  }
  const examList = main.querySelector('#exam-list');
  if (examList) {
    examList.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center;padding:var(--space-6)">No exam data available.</div>';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
