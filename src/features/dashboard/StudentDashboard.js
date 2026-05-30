import { createLayout } from '../../components/layout/Sidebar.js';
import { appState } from '../../app/main.js';
import { db, collection, query, where, getDocs, orderBy } from '../../lib/firebase.js';
import {
  db as supabaseDb,
  collection as sbCollection,
  query as sbQuery,
  where as sbWhere,
  getDocs as sbGetDocs,
  addDoc as sbAddDoc,
} from '../../lib/supabase-adapter.js';
import { router } from '../../app/router.js';
import { EmptyState } from '../../components/shared/EmptyState.js';

let countdownIntervals = [];

export function render(root) {
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  const user = appState.userData;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] || 'Aravind P';

  const layout = createLayout('Dashboard', '');
  root.appendChild(layout);

  const main = layout.querySelector('#page-main');
  main.innerHTML = `
    <!-- Desktop Actions (Sticky) -->
    <div class="hide-on-mobile" style="position: sticky; top: calc(var(--topbar-height, 64px) + 24px); z-index: 50; width: 100%; display: flex; justify-content: flex-end; height: 0px; pointer-events: none;">
      <button class="btn btn-primary" id="btn-add-event-desktop" style="border-radius:12px; height:48px; padding:0 24px; font-weight:700; pointer-events: auto; transform: translateY(-8px); box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Personal Event
      </button>
    </div>

    <!-- 1. Greeting -->
    <div style="margin-bottom:var(--space-4)">
      <h1 class="text-display" id="greeting" style="color:var(--accent-primary);font-size:1.5rem;font-weight:800;margin-bottom:var(--space-2)">
        ${greeting}, ${firstName} 👋
      </h1>
      <div class="flex items-center gap-2">
        <span class="badge badge-secondary" style="padding:4px 8px">[${user?.department || 'CSE'}]</span>
        <span class="badge badge-primary" style="padding:4px 8px">[Semester ${user?.semester || '—'}]</span>
      </div>
    </div>

    <!-- 2. Next Exam Hero Card -->
    <div class="hero-exam-card compact-hero" id="hero-exam" style="margin-bottom:var(--space-6); padding:var(--space-4);">
      <div style="margin-bottom:var(--space-3)">
        <span class="badge-next-exam" id="hero-badge" style="margin-bottom:var(--space-2); padding:4px 8px;">⏰ NEXT EXAM</span>
        <h2 style="font-size:1.2rem;font-weight:800;color:#A86E11;margin-bottom:var(--space-1)" id="hero-subject">Loading...</h2>
        <div class="flex items-center gap-3" style="color:#A86E11;font-size:var(--font-body-sm)" id="hero-meta">
          <span>📅 —</span><span>🕐 —</span><span>🏛️ —</span>
        </div>
      </div>
      <div class="countdown" id="hero-countdown" style="gap:var(--space-2)">
        <div class="countdown-unit">
          <div class="countdown-value hero" id="cd-days" style="font-size:1.5rem">00</div>
          <div class="countdown-label" style="font-size:0.7rem">Days</div>
        </div>
        <div class="countdown-sep" style="font-size:1.5rem">:</div>
        <div class="countdown-unit">
          <div class="countdown-value hero" id="cd-hours" style="font-size:1.5rem">00</div>
          <div class="countdown-label" style="font-size:0.7rem">Hours</div>
        </div>
        <div class="countdown-sep" style="font-size:1.5rem">:</div>
        <div class="countdown-unit">
          <div class="countdown-value hero" id="cd-mins" style="font-size:1.5rem">00</div>
          <div class="countdown-label" style="font-size:0.7rem">Mins</div>
        </div>
        <div class="countdown-sep" style="font-size:1.5rem">:</div>
        <div class="countdown-unit">
          <div class="countdown-value hero" id="cd-secs" style="font-size:1.5rem">00</div>
          <div class="countdown-label" style="font-size:0.7rem">Secs</div>
        </div>
      </div>
    </div>

    <!-- 3. Dashboard Stats Section -->
    <div class="dashboard-stats-grid" style="margin-bottom:var(--space-6)" id="stat-cards">
      <div class="stat-card" style="padding:var(--space-4); cursor:pointer; transition:transform 0.2s;" onclick="window.location.hash='#/student/gpa'" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="background:rgba(91,213,252,0.1)">📊</div>
        <div class="stat-value" id="stat-gpa" style="font-size:1.2rem">—</div>
        <div class="stat-label">Current GPA</div>
        <div class="stat-change text-success" style="font-size:0.7rem">Anna University Scale</div>
      </div>
      <div class="stat-card" style="padding:var(--space-4); cursor:pointer; transition:transform 0.2s;" onclick="window.location.hash='#/student/attendance'" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="background:rgba(74,222,128,0.1)">✅</div>
        <div class="stat-value" id="stat-attendance" style="font-size:1.2rem">—</div>
        <div class="stat-label">Attendance</div>
        <div class="stat-change" id="stat-attendance-msg" style="font-size:0.7rem">Loading...</div>
      </div>
      <div class="stat-card" style="padding:var(--space-4); cursor:pointer; transition:transform 0.2s;" onclick="window.location.hash='#/student/timetable'" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="background:rgba(67,97,238,0.1)">📅</div>
        <div class="stat-value" id="stat-exams" style="font-size:1.2rem">—</div>
        <div class="stat-label">Upcoming Exams</div>
        <div class="stat-change text-primary" style="font-size:0.7rem">Next in <span id="stat-next-days">—</span> days</div>
      </div>
      <div class="stat-card" style="padding:var(--space-4); cursor:pointer; transition:transform 0.2s;" onclick="window.location.hash='#/student/qa-board'" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="background:rgba(255,182,146,0.1)">💬</div>
        <div class="stat-value" id="stat-posts" style="font-size:1.2rem">—</div>
        <div class="stat-label">Q&A Posts</div>
        <div class="stat-change text-secondary" style="font-size:0.7rem">Your contributions</div>
      </div>
    </div>

    <!-- 4. Announcements Section -->
    <div style="margin-bottom:var(--space-6)">
      <h2 class="text-title" style="margin-bottom:var(--space-3)">📢 Announcements</h2>
      <div id="announcements-container" class="flex flex-col gap-3 announcements-list"></div>
    </div>

    <!-- 5. Recent Activity -->
    <div id="dashboard-main-grid" class="grid gap-6" style="grid-template-columns:1fr 360px">
      <!-- Left: Exam List -->
      <div class="flex flex-col gap-4">
        <div class="glass-card" style="padding:var(--space-4)">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-title">📋 Upcoming Exams / Events</h2>
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
          { icon:'🗓️', label:'AI Schedule Crafter', desc:'Auto-generate conflict-free schedule', path:'/student/timetable-maker' },
          { icon:'📄', label:'Record Book Forge', desc:'Generate with GitHub + QR codes', path:'/student/record-book' },
          { icon:'✅', label:'Attendance Calculator', desc:'Track your 80% mandate', path:'/student/attendance' },
          { icon:'📊', label:'CGPA / GPA', desc:'Anna University grading system', path:'/student/gpa' },
          { icon:'💬', label:'Knowledge Exchange', desc:'Post questions and tips', path:'/student/qa-board' },
        ].map(a => `
          <button class="flex items-center gap-4 w-full text-left quick-action-card" style="background:var(--surface-container-highest);border:1px solid rgba(216,155,41,0.1);border-radius:var(--radius-lg);padding:var(--space-3);cursor:pointer;transition:all 0.2s ease;outline:none" data-path="${a.path}" onclick="window.location.hash='#${a.path}'">
            <div style="font-size:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--surface-container);border-radius:8px;">${a.icon}</div>
            <div>
              <div style="font-size:var(--font-body-sm);font-weight:700;color:var(--color-on-surface)">${a.label}</div>
              <div style="font-size:11px;color:var(--color-on-surface-variant);margin-top:2px">${a.desc}</div>
            </div>
            <span style="margin-left:auto;color:var(--accent-primary)">›</span>
          </button>
        `).join('')}
        <div id="attendance-warning" class="alert alert-warning hidden" style="margin-top:var(--space-2)">
          <span>⚠️</span>
          <div>
            <div style="font-weight:700;margin-bottom:2px">Attendance Alert</div>
            <div id="attendance-warning-msg" style="font-size:var(--font-body-sm)">Loading...</div>
          </div>
        </div>
      </div>
    </div>


    <!-- Add Event Modal -->
    <div id="add-event-modal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div class="glass-card" style="width:100%;max-width:400px;background:var(--bg-surface);border-radius:12px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <h3 class="text-title-lg mb-4">Add Personal Event</h3>
        <form id="add-event-form" class="flex flex-col gap-3">
          <div class="form-group">
            <label class="form-label">Event/Subject Name</label>
            <input type="text" id="ev-name" class="form-input" required placeholder="e.g. Mock Test, Assignment Due" />
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" id="ev-date" class="form-input" required />
          </div>
          <div class="grid grid-2 gap-3">
             <div class="form-group">
               <label class="form-label">Start Time</label>
               <input type="time" id="ev-start" class="form-input" />
             </div>
             <div class="form-group">
               <label class="form-label">End Time</label>
               <input type="time" id="ev-end" class="form-input" />
             </div>
          </div>
          <div class="form-group">
             <label class="form-label">Type</label>
             <select id="ev-type" class="form-input">
               <option value="theory">Theory / General</option>
               <option value="practical">Practical / Lab</option>
             </select>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="btn btn-ghost" id="ev-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="ev-save">Save Event</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const fabHtml = `
    <!-- 6. Floating Action Button -->
    <button id="btn-add-event" class="mobile-fab-action" aria-label="Add Personal Event">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span style="font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">Personal Event</span>
    </button>
  `;
  layout.insertAdjacentHTML('beforeend', fabHtml);

  loadDashboardData(main);
  // setupAddEventModal needs to find the button inside layout, not just main
  setupAddEventModal(layout);
  loadAnnouncements(main);
}

async function loadAnnouncements(main) {
  const container = main.querySelector('#announcements-container');
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    
    const typeStyles = {
      info: { 
        bg: 'linear-gradient(135deg, rgba(67,97,238,0.12) 0%, rgba(67,97,238,0.03) 100%)', 
        border: 'rgba(67,97,238,0.3)', 
        shadow: 'rgba(67,97,238,0.15)', 
        blob: 'rgba(67,97,238,0.4)',
        iconBg: 'linear-gradient(135deg, rgba(67,97,238,0.2), rgba(67,97,238,0.05))',
        titleColor: '#8ca8ff',
        icon: '💡' 
      },
      warning: { 
        bg: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)', 
        border: 'rgba(245,158,11,0.3)', 
        shadow: 'rgba(245,158,11,0.15)',
        blob: 'rgba(245,158,11,0.4)',
        iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
        titleColor: '#fcd34d',
        icon: '⚡' 
      },
      success: { 
        bg: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.03) 100%)', 
        border: 'rgba(34,197,94,0.3)', 
        shadow: 'rgba(34,197,94,0.15)',
        blob: 'rgba(34,197,94,0.4)',
        iconBg: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
        titleColor: '#86efac',
        icon: '🚀' 
      },
      danger: { 
        bg: 'linear-gradient(135deg, rgba(239,68,104,0.12) 0%, rgba(239,68,104,0.03) 100%)', 
        border: 'rgba(239,68,104,0.3)', 
        shadow: 'rgba(239,68,104,0.15)',
        blob: 'rgba(239,68,104,0.4)',
        iconBg: 'linear-gradient(135deg, rgba(239,68,104,0.2), rgba(239,68,104,0.05))',
        titleColor: '#fda4af',
        icon: '🔥' 
      }
    };

    container.innerHTML = snap.docs.map(docSnap => {
      const data = docSnap.data();
      const style = typeStyles[data.type] || typeStyles.info;
      const date = new Date(data.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
      });

      return `
        <div class="announcement-banner" style="background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 16px; padding: 20px; display: flex; gap: 20px; align-items: flex-start; box-shadow: 0 8px 32px -8px ${style.shadow}; backdrop-filter: blur(12px); position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 40px -8px ${style.shadow}';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px -8px ${style.shadow}';">
          <!-- Decorative glow blob -->
          <div style="position:absolute; top:-20px; left:-20px; width:100px; height:100px; background:${style.blob}; border-radius:50%; filter:blur(40px); opacity:0.6; pointer-events:none;"></div>
          
          <div style="font-size: 24px; background: ${style.iconBg}; border-radius: 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px ${style.shadow}; z-index: 1; border: 1px solid ${style.border};">${style.icon}</div>
          <div style="flex: 1; z-index: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <h3 style="font-weight: 700; color: ${style.titleColor}; margin: 0; font-size: 16px; letter-spacing: -0.2px;">${data.title}</h3>
              <span style="font-size: 11px; color: var(--color-on-surface-variant); font-weight: 600; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">${date}</span>
            </div>
            <p class="announcement-text collapsed" style="margin: 0; font-size: 14px; color: var(--color-on-surface); line-height: 1.6; opacity: 0.9;">${data.message}</p>
            ${data.message.length > 120 ? `<button class="announcement-toggle" data-ann-id="${docSnap.id}">Read more</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach announcement toggle handlers
    container.querySelectorAll('.announcement-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const textEl = btn.previousElementSibling;
        if (textEl.classList.contains('collapsed')) {
          textEl.classList.remove('collapsed');
          textEl.classList.add('expanded');
          btn.textContent = 'Show less';
        } else {
          textEl.classList.remove('expanded');
          textEl.classList.add('collapsed');
          btn.textContent = 'Read more';
        }
      });
    });


  } catch (err) {
    console.error('Failed to load announcements:', err);
    container.style.display = 'none';
  }
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
    
    // Fetch academic calendar events
    const acSnap = await getDocs(collection(db, 'academicCalendar'));
    const acEvents = acSnap.docs.map(d => ({
      id: d.id,
      subject: d.data().name,
      examDate: d.id,
      examType: d.data().type,
      uploadedBy: 'admin',
      isGlobal: true
    }));

    const rawExams = [...snap.docs.map(d => ({ id: d.id, ...d.data() })), ...acEvents].map(e => ({
      ...e,
      examDate: standardizeDate(e.examDate)
    }));

    const now = new Date();
    const exams = rawExams
      .filter(e => {
        const timeStr = e.endTime || e.startTime || '23:59';
        const examEnd = new Date(`${e.examDate}T${timeStr}:00`);
        return isNaN(examEnd) ? e.examDate >= today : examEnd > now;
      })
      .sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return `${a.examDate}T${timeA}`.localeCompare(`${b.examDate}T${timeB}`);
      })
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
      main.querySelector('#stat-gpa').innerHTML = `<span style="font-size:1rem;opacity:0.5">—</span>`;
    }
  } catch { main.querySelector('#stat-gpa').innerHTML = `<span style="font-size:1rem;opacity:0.5">—</span>`; }

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
      } else if (pct < 80) {
        attMsg.className = 'stat-change text-warning';
        attMsg.textContent = '⚠️ Below 80% mandate';
        main.querySelector('#attendance-warning').classList.remove('hidden');
        main.querySelector('#attendance-warning-msg').textContent = `Your attendance is ${pct}% — below the 80% mandate. Please attend classes.`;
      } else {
        attMsg.className = 'stat-change text-success';
        attMsg.textContent = '✓ Above 80% mandate';
      }
    } else {
      main.querySelector('#stat-attendance').innerHTML = `<span style="font-size:1rem;opacity:0.5">—</span>`;
      main.querySelector('#stat-attendance-msg').textContent = 'No records yet';
    }
  } catch { main.querySelector('#stat-attendance').innerHTML = `<span style="font-size:1rem;opacity:0.5">—</span>`; }

  // Posts count
  try {
    const postsSnap = await getDocs(query(collection(db, 'posts'),
      where('userId', '==', appState.currentUser?.uid)
    ));
    main.querySelector('#stat-posts').textContent = postsSnap.size;
  } catch { main.querySelector('#stat-posts').textContent = '0'; }
}

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

function renderHeroExam(main, exam) {
  let badgeText = '⏰ NEXT EXAM';
  let subjectColor = '#A86E11';

  if (exam.examType === 'holiday') {
    badgeText = '🔴 UPCOMING HOLIDAY';
    subjectColor = 'var(--color-danger)';
  } else if (exam.examType === 'event') {
    badgeText = '🔵 UPCOMING EVENT';
    subjectColor = 'var(--color-secondary)';
  }

  const badge = main.querySelector('#hero-badge');
  if (badge) {
    badge.textContent = badgeText;
  }

  const subjectEl = main.querySelector('#hero-subject');
  if (subjectEl) {
    subjectEl.textContent = exam.subject;
    subjectEl.style.color = subjectColor;
  }

  const metaEl = main.querySelector('#hero-meta');
  if (metaEl) {
    metaEl.style.color = subjectColor;
    metaEl.innerHTML = `
      <span>📅 ${formatDate(exam.examDate)}</span>
      ${exam.startTime ? `<span>🕐 ${formatTime12(exam.startTime)}</span>` : ''}
      ${exam.hall ? `<span>🏛️ Hall ${exam.hall}</span>` : ''}
    `;
  }
}

function startCountdown(main, exam) {
  countdownIntervals.forEach(clearInterval);
  countdownIntervals = [];

  function tick() {
    const target = new Date(`${exam.examDate}T${exam.startTime || '09:00'}:00`);
    const endTarget = new Date(`${exam.examDate}T${exam.endTime || exam.startTime || '23:59'}:00`);
    const now    = new Date();
    
    if (now >= endTarget) {
      countdownIntervals.forEach(clearInterval);
      countdownIntervals = [];
      loadDashboardData(main);
      return;
    }

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
            <div class="exam-meta-item">🕐 ${exam.startTime ? formatTime12(exam.startTime) : 'TBA'} – ${exam.endTime ? formatTime12(exam.endTime) : 'TBA'}</div>
            ${exam.hall ? `<div class="exam-meta-item">🏛️ Hall ${exam.hall}</div>` : ''}
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-2">
          ${getDaysChip(exam.examDate)}
          ${exam.uploadedBy === 'student' ? `<button class="btn btn-ghost btn-sm text-danger" style="color:var(--color-danger);padding:4px 8px;font-size:12px" onclick="deletePersonalEvent('${exam.id}')">🗑️ Delete</button>` : ''}
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

function setupAddEventModal(main) {
  const modal = main.querySelector('#add-event-modal');
  const btnOpen = main.querySelector('#btn-add-event');
  const btnOpenDesktop = main.querySelector('#btn-add-event-desktop');
  const btnCancel = main.querySelector('#ev-cancel');
  const form = main.querySelector('#add-event-form');
  const saveBtn = main.querySelector('#ev-save');

  const openModal = () => {
    modal.classList.remove('hidden');
  };

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnOpenDesktop) btnOpenDesktop.addEventListener('click', openModal);

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      modal.classList.add('hidden');
      form.reset();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = appState.userData;
    if (!user || !user.registerNumber) {
      alert('Register Number is missing. Cannot save event.');
      return;
    }

    const payload = {
      subject: main.querySelector('#ev-name').value.trim(),
      examDate: main.querySelector('#ev-date').value,
      startTime: main.querySelector('#ev-start').value,
      endTime: main.querySelector('#ev-end').value,
      examType: main.querySelector('#ev-type').value,
      registerNumber: user.registerNumber,
      uploadedBy: 'student',
      uploadedAt: new Date().toISOString()
    };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      await sbAddDoc(sbCollection(supabaseDb, 'examSchedules'), payload);
      modal.classList.add('hidden');
      form.reset();
      // Reload dashboard data
      loadDashboardData(main);
    } catch (err) {
      console.error('Error adding event:', err);
      alert('Failed to save event. Try again later.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Event';
    }
  });
}

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
