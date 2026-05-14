import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp } from '/src/firebase.js';
import { showToast } from '../../main.js';

export function render(root) {
  const layout = createLayout('Academic Calendar', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth();

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">📆 Academic Calendar</h1>
      <p class="page-subtitle">Manage holidays, exam days, and special events. Students will see these on their attendance tracker.</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 360px;align-items:start">

      <!-- Calendar View -->
      <div class="glass-card">
        <div class="flex items-center justify-between mb-6">
          <button class="btn btn-ghost btn-sm" id="prev-month">‹</button>
          <h2 class="text-title" id="cal-month-title">—</h2>
          <button class="btn btn-ghost btn-sm" id="next-month">›</button>
        </div>
        <div class="calendar-grid mb-2">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="calendar-day-header">${d}</div>`).join('')}
        </div>
        <div class="calendar-grid" id="cal-days"></div>

        <div class="flex gap-3 mt-4">
          <span style="font-size:12px;display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:var(--color-danger);display:inline-block"></span>Holiday</span>
          <span style="font-size:12px;display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#c77dff;display:inline-block"></span>Exam</span>
          <span style="font-size:12px;display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:var(--color-secondary);display:inline-block"></span>Event</span>
          <span style="font-size:12px;display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:var(--color-primary-container);display:inline-block"></span>Today</span>
        </div>
      </div>

      <!-- Add Event + Event List -->
      <div class="flex flex-col gap-4">
        <div class="glass-card">
          <h3 class="text-title mb-4">➕ Add Event</h3>
          <form id="event-form" class="flex flex-col gap-3">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input class="form-input" id="event-date" type="date" required />
            </div>
            <div class="form-group">
              <label class="form-label">Event Name</label>
              <input class="form-input" id="event-name" type="text" placeholder="Pongal Holiday" required />
            </div>
            <div class="form-group">
              <label class="form-label">Event Type</label>
              <div class="flex gap-3 flex-wrap">
                ${[
                  { val:'holiday', label:'🔴 Holiday' },
                  { val:'exam',    label:'🟣 Exam Day' },
                  { val:'event',   label:'🔵 Event' },
                ].map(t => `
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-body-sm)">
                    <input type="radio" name="event-type" value="${t.val}" ${t.val==='holiday'?'checked':''} style="accent-color:var(--color-primary-container)">
                    ${t.label}
                  </label>
                `).join('')}
              </div>
            </div>
            <button type="submit" class="btn btn-primary w-full">Add to Calendar</button>
          </form>
        </div>

        <div class="glass-card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-title">📋 Events This Month</h3>
            <button class="btn btn-ghost btn-sm" id="refresh-events">🔄</button>
          </div>
          <div id="events-list" class="flex flex-col gap-2"></div>
        </div>
      </div>
    </div>
  `;

  let events = {};   // { 'YYYY-MM-DD': { name, type } }

  async function loadEvents() {
    try {
      const snap = await getDocs(collection(db, 'academicCalendar'));
      events = {};
      snap.docs.forEach(d => { events[d.id] = d.data(); });
      renderCalendar();
      renderEventList();
    } catch (err) {
      showToast('Failed to load events: ' + err.message, 'error');
    }
  }

  function renderCalendar() {
    const year = currentYear, month = currentMonth;
    const monthTitle = new Date(year, month, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    main.querySelector('#cal-month-title').textContent = monthTitle;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = '';
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const event   = events[dateStr];
      const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===d;
      const color   = event?.type === 'holiday' ? 'var(--color-danger)' :
                      event?.type === 'exam'    ? '#c77dff' :
                      event?.type === 'event'   ? 'var(--color-secondary)' : null;
      html += `
        <div class="calendar-day ${isToday?'today':''}" title="${event?.name||''}"
          style="${color?`background:${color}22;color:${color};font-weight:700`:''}"
          data-date="${dateStr}">
          ${d}
        </div>
      `;
    }
    main.querySelector('#cal-days').innerHTML = html;

    // Click on day to pre-fill form
    main.querySelectorAll('#cal-days .calendar-day').forEach(el => {
      el.addEventListener('click', () => {
        main.querySelector('#event-date').value = el.dataset.date;
        main.querySelector('#event-name').focus();
      });
    });
  }

  function renderEventList() {
    const prefix = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;
    const monthEvents = Object.entries(events)
      .filter(([date]) => date.startsWith(prefix))
      .sort(([a],[b]) => a.localeCompare(b));

    const container = main.querySelector('#events-list');
    if (monthEvents.length === 0) {
      container.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center;padding:16px">No events this month</div>';
      return;
    }
    container.innerHTML = monthEvents.map(([date, ev]) => {
      const color = ev.type === 'holiday' ? 'var(--color-danger)' : ev.type === 'exam' ? '#c77dff' : 'var(--color-secondary)';
      const icon  = ev.type === 'holiday' ? '🔴' : ev.type === 'exam' ? '🟣' : '🔵';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-md);background:var(--color-surface-container-high)">
          <span>${icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:var(--font-body-sm);color:${color}">${ev.name}</div>
            <div style="font-size:11px;color:var(--color-on-surface-variant)">${formatDate(date)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px" onclick="deleteEvent('${date}')">🗑️</button>
        </div>
      `;
    }).join('');
  }

  main.querySelector('#event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = main.querySelector('#event-date').value;
    const name = main.querySelector('#event-name').value.trim();
    const type = main.querySelector('input[name="event-type"]:checked').value;
    if (!date || !name) return;
    try {
      await setDoc(doc(db, 'academicCalendar', date), { name, type, createdAt: serverTimestamp() });
      events[date] = { name, type };
      renderCalendar();
      renderEventList();
      e.target.reset();
      showToast(`${name} added to calendar!`, 'success');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  });

  main.querySelector('#prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(); renderEventList();
  });
  main.querySelector('#next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(); renderEventList();
  });

  main.querySelector('#refresh-events').addEventListener('click', loadEvents);

  window.deleteEvent = async function(date) {
    if (!confirm(`Delete event on ${date}?`)) return;
    try {
      await deleteDoc(doc(db, 'academicCalendar', date));
      delete events[date];
      renderCalendar(); renderEventList();
      showToast('Event removed', 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  };

  loadEvents();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
