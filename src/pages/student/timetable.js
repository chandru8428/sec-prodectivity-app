import { createLayout } from '../../components/sidebar.js';
import { appState } from '../../main.js';
import { db, collection, query, where, getDocs } from '/src/supabase-adapter.js';

let countdownIntervals = [];

export function render(root) {
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  const layout = createLayout('Exam Roadmap', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">📅 Exam Timetable</h1>

    </div>
    <div id="timetable-content">
      <div class="flex flex-col gap-4">
        <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
        <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
        <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
      </div>
    </div>
  `;

  loadExams(main.querySelector('#timetable-content'));
}

async function loadExams(container) {
  const user = appState.userData;
  if (!user?.registerNumber) {
    container.innerHTML = `
      <div class="glass-card" style="text-align:center;padding:var(--space-12)">
        <div style="font-size:64px;margin-bottom:var(--space-4)">🪪</div>
        <h2 class="text-title">Register Number Not Set</h2>
        <p class="text-muted" style="margin-top:var(--space-2)">Please update your profile with your register number to view your exam schedule.</p>
      </div>
    `;
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db,'examSchedules'), where('registerNumber','==', user.registerNumber));
    const snap = await getDocs(q);
    const all = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => (a.examDate||'').localeCompare(b.examDate||''));

    const theory    = all.filter(e => !e.examType || e.examType === 'theory');
    const practical = all.filter(e => e.examType === 'practical');

    if (all.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:var(--space-12)">
          <div style="font-size:64px;margin-bottom:var(--space-4)">📭</div>
          <h2 class="text-title">No Exams Found</h2>
          <p class="text-muted" style="margin-top:var(--space-2)">Your admin hasn't uploaded the exam timetable yet. Check back later.</p>
          <p class="text-muted text-body-sm" style="margin-top:var(--space-2);opacity:0.6">Logged in as: <strong>${user.registerNumber}</strong></p>
        </div>
      `;
      return;
    }

    // Build tab UI
    container.innerHTML = `
      <!-- Summary bar -->
      <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
        <div class="glass-card" style="text-align:center;padding:var(--space-4)">
          <div style="font-size:1.8rem;font-weight:900;color:var(--color-primary)">${all.length}</div>
          <div style="font-size:11px;color:var(--color-on-surface-variant)">Total Exams</div>
        </div>
        <div class="glass-card" style="text-align:center;padding:var(--space-4)">
          <div style="font-size:1.8rem;font-weight:900;color:var(--color-warning)">${all.filter(e=>e.examDate>=today).length}</div>
          <div style="font-size:11px;color:var(--color-on-surface-variant)">Upcoming</div>
        </div>
        <div class="glass-card" style="text-align:center;padding:var(--space-4)">
          <div style="font-size:1.8rem;font-weight:900;color:var(--color-success)">${all.filter(e=>e.examDate<today).length}</div>
          <div style="font-size:11px;color:var(--color-on-surface-variant)">Completed</div>
        </div>
        <div class="glass-card" style="text-align:center;padding:var(--space-4)">
          <div style="font-size:1.8rem;font-weight:900;color:var(--color-secondary)">${theory.length} / ${practical.length}</div>
          <div style="font-size:11px;color:var(--color-on-surface-variant)">Theory / Practical</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs mb-6">
        <button class="tab active" id="tab-all">📋 All (${all.length})</button>
        <button class="tab" id="tab-theory">📝 Theory (${theory.length})</button>
        <button class="tab" id="tab-practical">🧪 Practical (${practical.length})</button>
      </div>

      <!-- Tab content panels -->
      <div id="panel-all"></div>
      <div id="panel-theory" class="hidden"></div>
      <div id="panel-practical" class="hidden"></div>
    `;

    // Tab switching
    ['all','theory','practical'].forEach(tab => {
      container.querySelector(`#tab-${tab}`).addEventListener('click', () => {
        ['all','theory','practical'].forEach(t => {
          container.querySelector(`#tab-${t}`).classList.remove('active');
          container.querySelector(`#panel-${t}`).classList.add('hidden');
        });
        container.querySelector(`#tab-${tab}`).classList.add('active');
        container.querySelector(`#panel-${tab}`).classList.remove('hidden');
      });
    });

    // Render each panel
    renderExamPanel(container.querySelector('#panel-all'), all, today);
    renderExamPanel(container.querySelector('#panel-theory'), theory, today);
    renderExamPanel(container.querySelector('#panel-practical'), practical, today);

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger"><span>⚠️</span><span>Failed to load exams: ${err.message}</span></div>`;
  }
}

function renderExamPanel(panel, exams, today) {
  if (exams.length === 0) {
    panel.innerHTML = `<div class="glass-card" style="text-align:center;padding:var(--space-8)"><div style="font-size:3rem">📭</div><p class="text-muted mt-2">No exams in this category</p></div>`;
    return;
  }

  const upcoming = exams.filter(e => e.examDate >= today);
  const past     = exams.filter(e => e.examDate < today);

  panel.innerHTML = `
    ${upcoming.length > 0 ? `
      <div class="mb-6">
        <h2 class="text-title-lg mb-4" style="display:flex;align-items:center;gap:8px">
          ⏰ Upcoming Exams
          <span class="badge badge-warning">${upcoming.length}</span>
        </h2>
        <div class="flex flex-col gap-4" id="${panel.id}-upcoming"></div>
      </div>
    ` : ''}
    ${past.length > 0 ? `
      <div>
        <h2 class="text-title-lg mb-4" style="display:flex;align-items:center;gap:8px;color:var(--color-on-surface-variant)">
          ✅ Completed Exams
          <span class="badge" style="background:var(--primary-container);color:var(--accent-primary)">${past.length}</span>
        </h2>
        <div class="flex flex-col gap-3" id="${panel.id}-past"></div>
      </div>
    ` : ''}
  `;

  if (upcoming.length > 0) {
    const upcomingList = panel.querySelector(`#${panel.id}-upcoming`);
    upcoming.forEach((exam, i) => {
      const isPractical = exam.examType === 'practical';
      const accentColor = isPractical ? 'var(--accent-secondary)' : 'var(--accent-primary)';
      const typeLabel   = isPractical ? '🧪 Practical' : '📝 Theory';

      const target  = new Date(`${exam.examDate}T${exam.startTime || '10:00'}:00`);
      const diffMs  = target - new Date();
      const daysLeft = Math.ceil(diffMs / 86400000);
      const isToday  = daysLeft <= 0;
      const isTomorrow = daysLeft === 1;

      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.cssText = `border-left:4px solid ${isPractical?'#7C3AED':'#4F46E5'};transition:transform 0.2s`;

      card.innerHTML = `
        <div class="flex items-start gap-4">
          <div style="flex:1;min-width:0">
            <!-- Header row -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="text-title" style="font-size:1.1rem;color:var(--text-primary)">${exam.subject || '—'}</span>
              ${exam.subjectCode ? `<span class="badge" style="background:#F1F5F9;color:#475569;font-size:10px">${exam.subjectCode}</span>` : ''}
              <span class="badge" style="background:${isPractical?'#F5F3FF':'#EEF2FF'};color:${isPractical?'#7C3AED':'#4F46E5'};font-size:10px">${typeLabel}</span>
              ${i === 0 ? '<span class="badge" style="background:#FFF7ED;color:#C2410C">Next Up</span>' : ''}
            </div>
            <!-- Details row -->
            <div class="flex flex-wrap gap-3" style="font-size:13px">
              <span style="color:var(--text-secondary)">📅 ${formatDate(exam.examDate)}</span>
              ${exam.session
                ? `<span style="color:var(--text-secondary)">⏰ <span class="badge ${exam.session==='FN'?'badge-primary':'badge-warning'}" style="font-size:10px">${exam.session==='FN'?'FN · 10:00 AM – 1:00 PM':'AN · 2:00 PM – 5:00 PM'}</span></span>`
                : exam.startTime ? `<span style="color:var(--text-secondary)">🕐 ${exam.startTime} – ${exam.endTime}</span>` : ''}
              ${exam.hall ? `<span style="color:var(--text-secondary)">🏛️ Hall: <strong>${exam.hall}</strong></span>` : ''}
            </div>
            <!-- Action buttons -->
            <div class="flex gap-2 mt-3 flex-wrap">
              <button class="btn btn-secondary btn-sm"
                onclick="addToCalendar('${(exam.subject||'').replace(/'/g,"\\'")}','${exam.examDate}','${exam.startTime||'10:00'}','${exam.endTime||'13:00'}')">
                📆 Add to Calendar
              </button>
              <button class="btn btn-ghost btn-sm" onclick="notifyExam('${(exam.subject||'').replace(/'/g,"\\'")}','${exam.examDate}')">
                🔔 Alert Me
              </button>
            </div>
          </div>

          <!-- Countdown column -->
          <div class="text-right" style="flex-shrink:0;min-width:100px">
            ${isToday
              ? '<div class="badge badge-danger" style="font-size:11px;padding:6px 12px;animation:pulse 1s infinite">Today!</div>'
              : isTomorrow
              ? '<div class="badge badge-warning" style="font-size:11px;padding:6px 12px">Tomorrow!</div>'
              : `<div class="badge badge-primary" style="font-size:11px;padding:6px 12px">${daysLeft} days left</div>`
            }
          </div>
        </div>
      `;

      upcomingList.appendChild(card);
    });
  }

  if (past.length > 0) {
    const pastList = panel.querySelector(`#${panel.id}-past`);
    pastList.innerHTML = past.map(exam => {
      const isPractical = exam.examType === 'practical';
      const accentColor = isPractical ? '#7C3AED' : '#4F46E5';
      return `
        <div style="display:flex;align-items:center;gap:var(--space-4);padding:12px 16px;border-radius:12px;background:#FFFFFF;border:1px solid var(--border-primary);opacity:0.8;border-left:3px solid ${accentColor}44">
          <span style="font-size:1.4rem">${isPractical?'🧪':'📝'}</span>
          <div style="flex:1">
            <div style="font-weight:600;color:var(--text-primary)">${exam.subject||'—'}</div>
            <div style="font-size:12px;color:var(--text-secondary)">
              ${formatDate(exam.examDate)}
              ${exam.session ? `· ${exam.session==='FN'?'FN 10AM':'AN 2PM'}` : ''}
              ${exam.hall ? `· Hall: ${exam.hall}` : ''}
            </div>
          </div>
          ${exam.subjectCode ? `<span class="badge" style="background:#F1F5F9;color:#64748B;font-size:10px">${exam.subjectCode}</span>` : ''}
          <span class="badge" style="background:#DCFCE7;color:#166534">✅ Done</span>
        </div>
      `;
    }).join('');

  }
}

window.addToCalendar = function(subject, date, startTime, endTime) {
  const start = date.replace(/-/g,'') + 'T' + startTime.replace(':','') + '00';
  const end   = date.replace(/-/g,'') + 'T' + endTime.replace(':','') + '00';
  const url   = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(subject+' Exam')}&dates=${start}/${end}&details=${encodeURIComponent('EduSync Exam Reminder')}&location=Exam+Hall`;
  window.open(url, '_blank');
};

window.notifyExam = function(subject, examDate) {
  if (!('Notification' in window)) { alert('Notifications not supported'); return; }
  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') { alert('Please allow notifications to get exam alerts.'); return; }

    // Immediate confirmation notification
    new Notification('🔔 EduSync Reminder Set', {
      body: `You will be reminded 1 day before "${subject}" exam on ${examDate}`,
      icon: '/favicon.ico'
    });

    // Check daily and fire on exam day
    const examTime = new Date(`${examDate}T09:00:00`).getTime();
    const now = Date.now();
    const oneDayBefore = examTime - 86400000;
    const twoHoursBefore = examTime - 7200000;

    if (now < oneDayBefore) {
      const msUntil = oneDayBefore - now;
      setTimeout(() => {
        new Notification('📅 Exam Tomorrow!', {
          body: `"${subject}" exam is tomorrow. Good luck! 💪`,
          icon: '/favicon.ico'
        });
      }, msUntil);
    }
    if (now < twoHoursBefore) {
      setTimeout(() => {
        new Notification('⏰ Exam in 2 Hours!', {
          body: `"${subject}" exam starts in 2 hours. Be prepared!`,
          icon: '/favicon.ico'
        });
      }, twoHoursBefore - now);
    }
  });
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
}
