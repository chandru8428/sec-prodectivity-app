import { createLayout } from '../../components/layout/Sidebar.js';
import { appState } from '../../app/main.js';
import { supabase } from '../../lib/supabase.js';
import { db, collection, getDocs } from '../../lib/firebase.js';

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

function standardizeDate(dStr) {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const m = String(dStr).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return dStr;
}

async function loadExams(container) {
  let user = appState.userData;

  // If userData is missing registerNumber, re-fetch from Supabase directly
  if (!user?.registerNumber && appState.currentUser?.uid) {
    const { data: freshUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', appState.currentUser.uid)
      .single();
    if (freshUser) {
      appState.userData = freshUser;
      user = freshUser;
    }
  }

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
    // Normalize: trim + uppercase to match admin-stored format
    const regNo = String(user.registerNumber).trim().toUpperCase();

    // Direct Supabase query — no adapter abstraction
    const { data: sbExams, error: qErr } = await supabase
      .from('examSchedules')
      .select('*')
      .eq('registerNumber', regNo);

    if (qErr) throw qErr;

    let acEvents = [];
    try {
      const acSnap = await getDocs(collection(db, 'academicCalendar'));
      acEvents = acSnap.docs.map(d => ({
        id: d.id,
        subject: d.data().name,
        examDate: d.id,
        examType: d.data().type,
        uploadedBy: 'admin',
        isGlobal: true
      }));
    } catch (err) {
      console.warn('Could not load academicCalendar', err);
    }

    const rawExams = [...(sbExams || []), ...acEvents].map(e => ({
      ...e,
      examDate: standardizeDate(e.examDate)
    }));

    const all = rawExams.sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''));

    const theory    = all.filter(e => !e.examType || e.examType === 'theory' || e.isGlobal);
    const practical = all.filter(e => e.examType === 'practical');

    if (all.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:var(--space-12)">
          <div style="font-size:64px;margin-bottom:var(--space-4)">📭</div>
          <h2 class="text-title">No Exams Found</h2>
          <p class="text-muted" style="margin-top:var(--space-2)">Your admin hasn't uploaded the exam timetable yet. Check back later.</p>
          <p class="text-muted text-body-sm" style="margin-top:var(--space-2);opacity:0.6">
            Searching for: <strong>${regNo}</strong>
          </p>
        </div>
      `;
      return;
    }


    // Build tab UI
    container.innerHTML = `
      <!-- Summary bar -->
      <div class="grid summary-stats-grid" style="gap:var(--space-4);margin-bottom:var(--space-6)">
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
      <div class="filter-tabs mb-6">
        <button class="filter-tab active" id="tab-all">📋 All (${all.length})</button>
        <button class="filter-tab" id="tab-theory">📝 Theory (${theory.length})</button>
        <button class="filter-tab" id="tab-practical">🧪 Practical (${practical.length})</button>
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
      let accentColor = isPractical ? '#7C3AED' : 'var(--color-primary)';
      let typeLabel   = isPractical ? '🧪 Practical' : '📝 Theory';
      let bgColor     = isPractical ? '#F5F3FF' : '#EEF2FF';
      let fgColor     = isPractical ? '#7C3AED' : '#4F46E5';

      if (exam.examType === 'holiday') {
        typeLabel = '🔴 Holiday';
        accentColor = 'var(--color-danger)';
        bgColor = '#FEF2F2';
        fgColor = 'var(--color-danger)';
      } else if (exam.examType === 'event') {
        typeLabel = '🔵 Event';
        accentColor = 'var(--color-secondary)';
        bgColor = '#F0F9FF';
        fgColor = 'var(--color-secondary)';
      } else if (exam.examType === 'exam' && exam.isGlobal) {
        typeLabel = '🟣 Exam';
        accentColor = '#c77dff';
        bgColor = '#FAF5FF';
        fgColor = '#c77dff';
      }

      const target  = new Date(`${exam.examDate}T${exam.startTime || '09:00'}:00`);
      const diffMs  = target - new Date();
      const daysLeft = Math.ceil(diffMs / 86400000);
      const isToday  = daysLeft <= 0;
      const isTomorrow = daysLeft === 1;

      const cdId = `cd-${exam.id || i}-${Date.now()}`;
      let badgeHtml = '';
      let needsInterval = false;

      // Show timer if exam is within 48 hours
      if (diffMs > 0 && diffMs <= 86400000 * 2) {
        badgeHtml = `<div class="badge badge-timer-alert" id="${cdId}">⏳</div>`;
        needsInterval = true;
      } else if (diffMs <= 0 && isToday) {
        badgeHtml = '<div class="badge badge-danger" style="font-size:11px;padding:6px 12px">Ongoing / Done</div>';
      } else {
        badgeHtml = `<div class="badge badge-primary" style="font-size:11px;padding:6px 12px">${daysLeft} days left</div>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-card exam-card-upcoming';
      card.setAttribute('data-type', isPractical ? 'practical' : 'theory');
      card.style.cssText = `
        border-left: 5px solid ${accentColor};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      `;

      card.innerHTML = `
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div style="flex:1;min-width:0">
              <!-- Header row -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="text-title" style="font-size:1.1rem;color:var(--text-primary);line-height:1.3">${exam.subject || '—'}</span>
              </div>
              <div class="flex items-center gap-2 mb-3 flex-wrap">
                ${exam.subjectCode ? `<span class="badge" style="background:#F1F5F9;color:#475569;font-size:10px">${exam.subjectCode}</span>` : ''}
                <span class="badge" style="background:${bgColor};color:${fgColor};font-size:10px">${typeLabel}</span>
                ${exam.uploadedBy === 'student' ? '<span class="badge" style="background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;font-size:10px">🌟 Personal Event</span>' : ''}
                ${i === 0 ? '<span class="badge" style="background:#FFF7ED;color:#C2410C;font-size:10px">Next Up</span>' : ''}
              </div>
              <!-- Details row -->
              <div class="flex flex-col gap-2" style="font-size:13px">
                <span style="color:var(--text-secondary);display:flex;align-items:center;gap:6px">
                  <span style="font-size:16px">📅</span> <span>${formatDate(exam.examDate)}</span>
                </span>
                ${exam.session
                  ? `<span style="color:var(--text-secondary);display:flex;align-items:center;gap:6px">
                       <span style="font-size:16px">⏰</span> <span class="badge ${exam.session==='FN'?'badge-primary':'badge-warning'}" style="font-size:10px">${exam.session==='FN'?'FN · 9:00 AM – 12:00 PM':'AN · 1:00 PM – 4:00 PM'}</span>
                     </span>`
                  : exam.startTime ? `<span style="color:var(--text-secondary);display:flex;align-items:center;gap:6px"><span style="font-size:16px">🕐</span> <span>${exam.startTime} – ${exam.endTime}</span></span>` : ''}
                ${exam.hall ? `<span style="color:var(--text-secondary);display:flex;align-items:center;gap:6px"><span style="font-size:16px">🏛️</span> <span>Hall: <strong>${exam.hall}</strong></span></span>` : ''}
                ${exam.staffName ? `<span style="color:var(--text-secondary);display:flex;align-items:center;gap:6px"><span style="font-size:16px">👨‍🏫</span> <span>Staff: <strong>${exam.staffName}</strong></span></span>` : ''}
              </div>
            </div>
            
            <!-- Countdown badge at top right -->
            <div class="text-right" style="flex-shrink:0">
              ${badgeHtml}
            </div>
          </div>
          
          <!-- Action buttons (Touch-friendly height >= 44px) -->
          <div class="flex gap-2 mt-2 flex-wrap" style="border-top: 1px solid var(--border-color); padding-top: var(--space-3)">
            <button class="btn btn-secondary" style="flex:1;min-height:44px;font-size:13px"
              onclick="addToCalendar('${(exam.subject||'').replace(/'/g,"\\'")}','${exam.examDate}','${exam.startTime||'09:00'}','${exam.endTime||'12:00'}')">
              📆 Add to Calendar
            </button>
            <button class="btn btn-ghost" style="flex:1;min-height:44px;font-size:13px;border:1px solid var(--border-color)" onclick="notifyExam('${(exam.subject||'').replace(/'/g,"\\'")}','${exam.examDate}')">
              🔔 Alert Me
            </button>
            ${exam.uploadedBy === 'student' ? `<button class="btn btn-ghost text-danger" style="flex:1;min-height:44px;font-size:13px;border:1px solid var(--border-color);color:var(--color-danger)" onclick="deletePersonalEvent('${exam.id}')">🗑️ Delete</button>` : ''}
          </div>
        </div>
      `;

      upcomingList.appendChild(card);
      
      if (needsInterval) {
        const timerEl = card.querySelector(`#${cdId}`);
        const updateTimer = () => {
          const now = new Date();
          let remain = target - now;
          if (remain <= 0) {
            timerEl.innerHTML = 'Started / Ongoing';
            timerEl.className = 'badge badge-success';
            timerEl.style.animation = 'none';
            timerEl.style.boxShadow = 'none';
            return;
          }
          const h = Math.floor(remain / 3600000);
          remain %= 3600000;
          const m = Math.floor(remain / 60000).toString().padStart(2, '0');
          remain %= 60000;
          const s = Math.floor(remain / 1000).toString().padStart(2, '0');
          timerEl.innerHTML = `⏳ ${h}h ${m}m ${s}s`;
        };
        updateTimer();
        countdownIntervals.push(setInterval(updateTimer, 1000));
      }
    });
  }

  if (past.length > 0) {
    const pastList = panel.querySelector(`#${panel.id}-past`);
    pastList.innerHTML = past.map(exam => {
      let isPractical = exam.examType === 'practical';
      let accentColor = isPractical ? '#7C3AED' : 'var(--color-primary)';
      let icon = isPractical ? '🧪' : '📝';
      
      if (exam.examType === 'holiday') { accentColor = 'var(--color-danger)'; icon = '🔴'; }
      else if (exam.examType === 'event') { accentColor = 'var(--color-secondary)'; icon = '🔵'; }
      else if (exam.examType === 'exam' && exam.isGlobal) { accentColor = '#c77dff'; icon = '🟣'; }

      return `
        <div class="exam-card-past" style="display:flex;align-items:center;gap:var(--space-4);padding:12px 16px;border-radius:12px;
          border-left: 4px solid ${accentColor};
          opacity: 0.9;
          transition: transform 0.2s ease;
        ">
          <span style="font-size:1.4rem">${icon}</span>
          <div style="flex:1">
            <div style="font-weight:600;color:var(--color-on-surface)">${exam.subject||'—'}</div>
            <div style="font-size:12px;color:var(--color-on-surface-variant)">
              ${formatDate(exam.examDate)}
              ${exam.session ? `· ${exam.session==='FN'?'FN 10AM':'AN 2PM'}` : ''}
              ${exam.hall ? `· Hall: ${exam.hall}` : ''}
              ${exam.staffName ? `· Staff: ${exam.staffName}` : ''}
            </div>
          </div>
          ${exam.uploadedBy === 'student' ? '<span class="badge badge-warning" style="font-size:10px">🌟 Personal</span>' : ''}
          ${exam.subjectCode ? `<span class="badge" style="font-size:10px">${exam.subjectCode}</span>` : ''}
          <span class="badge badge-success">✅ Done</span>
          ${exam.uploadedBy === 'student' ? `<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px;margin-left:8px" onclick="deletePersonalEvent('${exam.id}')" title="Delete">🗑️</button>` : ''}
        </div>
      `;
    }).join('');

  }
}

window.addToCalendar = function(subject, date, startTime, endTime) {
  const start = date.replace(/-/g,'') + 'T' + startTime.replace(':','') + '00';
  const end   = date.replace(/-/g,'') + 'T' + endTime.replace(':','') + '00';
  
  // Generate ICS file content with alarms
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EduSync//Timetable//EN
BEGIN:VEVENT
SUMMARY:${subject} Exam
DTSTART:${start}
DTEND:${end}
DESCRIPTION:EduSync Exam Reminder
LOCATION:Exam Hall
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Reminder: ${subject} Exam tomorrow
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: ${subject} Exam in 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_exam.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.deletePersonalEvent = async function(id) {
  if (!confirm('Are you sure you want to delete this personal event?')) return;
  try {
    const { deleteDoc, doc, db: supabaseDb } = await import('../../lib/supabase-adapter.js');
    await deleteDoc(doc(supabaseDb, 'examSchedules', id));
    window.location.reload();
  } catch(err) {
    console.error('Delete error:', err);
    alert('Failed to delete event.');
  }
};

window.notifyExam = function(subject, examDate) {
  if (!('Notification' in window)) { alert('Notifications not supported'); return; }
  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') { alert('Please allow notifications to get exam alerts.'); return; }

    // Immediate confirmation notification
    new Notification('🔔 EduSync Reminder Set', {
      body: `You will be reminded 1 day before and 1 hour before "${subject}" exam on ${examDate}`,
      icon: '/favicon.ico'
    });

    // Check daily and fire on exam day
    const examTime = new Date(`${examDate}T09:00:00`).getTime();
    const now = Date.now();
    const oneDayBefore = examTime - 86400000;
    const oneHourBefore = examTime - 3600000; // Optimized to 1 hour before

    if (now < oneDayBefore) {
      const msUntil = oneDayBefore - now;
      setTimeout(() => {
        new Notification('📅 Exam Tomorrow!', {
          body: `"${subject}" exam is tomorrow. Good luck! 💪`,
          icon: '/favicon.ico'
        });
      }, msUntil);
    }
    if (now < oneHourBefore) {
      setTimeout(() => {
        new Notification('⏰ Exam in 1 Hour!', {
          body: `"${subject}" exam starts in 1 hour. Be prepared!`,
          icon: '/favicon.ico'
        });
      }, oneHourBefore - now);
    }
  });
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
}
