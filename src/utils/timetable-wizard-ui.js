/**
 * timetable-wizard-ui.js — v4
 */
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TIMES = ['8-10','10-12','1-3','3-5'];
const TIME_LABELS = { '8-10':'8–10 AM', '10-12':'10–12 PM', '1-3':'1–3 PM', '3-5':'3–5 PM' };
const COLORS = ['#4361ee','#7209b7','#f72585','#00a3c8','#00c39a','#f5a623','#e74c3c','#3a0ca3','#06b6d4','#84cc16'];

export function getSubjectColor(idx) { return COLORS[idx % COLORS.length]; }

export function renderProgressBar(step) {
  const labels = ['Input','Select Subjects','Preferences','Generate','Timetable'];
  return `<div class="glass-card mb-4" style="padding:var(--space-4)">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;flex-wrap:wrap;gap:4px">
      ${labels.map((l,i) => `<span style="color:${(i+1)===step?'var(--color-primary)':(i+1)<step?'var(--color-on-surface)':'var(--color-on-surface-variant)'};font-weight:${(i+1)<=step?'700':'400'}">${i+1}. ${l}</span>`).join('')}
    </div>
    <div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden">
      <div style="height:100%;width:${Math.round(step/5*100)}%;background:var(--color-primary);transition:width 0.35s"></div>
    </div>
  </div>`;
}

export function renderStep1(rawText) {
  return `<div class="glass-card fade-in">
    <h2 class="text-title-lg mb-2">Step 1 · Provide Timetable Data</h2>
    <p class="text-muted mb-4" style="font-size:13px">Copy all text from your exam preview PDF and paste below, or upload the PDF.</p>
    <div class="tabs mb-4">
      <button class="tab active" id="t-txt">📋 Paste Text</button>
      <button class="tab" id="t-pdf">📄 Upload PDF</button>
    </div>
    <div id="a-txt">
      <textarea id="inp" class="form-input" style="height:240px;resize:vertical;font-family:monospace;font-size:12px;line-height:1.6"
        placeholder="Paste exam preview text here...">${rawText}</textarea>
    </div>
    <div id="a-pdf" class="hidden">
      <label for="pdf-inp" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;border:2px dashed var(--outline);border-radius:var(--radius-xl);cursor:pointer;gap:12px">
        <div style="font-size:48px;opacity:0.4">📄</div>
        <div class="text-muted">Click to select PDF file</div>
        <div id="pdf-nm" style="display:none" class="badge badge-primary"></div>
      </label>
      <input type="file" id="pdf-inp" accept=".pdf" style="display:none">
    </div>
    <div id="parse-status" style="display:none" class="mt-3"></div>
    <div class="flex justify-between mt-5">
      <button class="btn btn-ghost btn-sm" id="s1-reset" style="color:var(--color-danger);opacity:0.7">🗑️ Reset All</button>
      <button class="btn btn-primary" id="s1b">⚡ Extract & Parse →</button>
    </div>
  </div>`;
}

export function renderStep2(subjects) {
  if (!subjects.length) {
    return `<div class="glass-card fade-in">
      <h2 class="text-title-lg mb-4">Step 2 · Select Subjects</h2>
      <div class="text-muted" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>No subjects found. Go back and check your input.
      </div>
      <button class="btn btn-secondary" id="back-1">← Back</button>
    </div>`;
  }

  const cards = subjects.map((s, i) => {
    const c = getSubjectColor(i);
    const totalSlots = (s.teachers||[]).reduce((n,t) => n + (t.slots||[]).length, 0);
    const teacherList = (s.teachers||[]).map(t =>
      (t.slots||[]).map(sl => {
        const days = (sl.classes||[]).map(cls => `${cls.day.slice(0,3)} ${cls.time}`).join(' · ');
        return `<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="background:${c}22;color:${c};font-weight:700;padding:1px 7px;border-radius:20px;font-size:10px;border:1px solid ${c}44">${sl.slot_name}</span>
          <span style="color:var(--color-on-surface-variant);font-size:11px">${t.staff_name}</span>
          ${days?`<span style="color:var(--color-on-surface-variant);font-size:10px">${days}</span>`:''}
        </div>`;
      }).join('')
    ).join('');

    return `<div class="subj-card" data-idx="${i}" style="padding:14px;border-radius:var(--radius-lg);border:2px solid var(--border-color);cursor:pointer;transition:all 0.2s;position:relative">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:4px">
        <div>
          <span style="font-weight:700;font-size:14px;color:${c}">${s.subject_name||'(No name)'}</span>
          ${s.subject_code?`<span class="badge badge-primary" style="font-size:10px;margin-left:6px">${s.subject_code}</span>`:''}
        </div>
        <div id="chk-${i}" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border-color);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;background:var(--bg-secondary);transition:all 0.2s"></div>
      </div>
      <div style="font-size:11px;color:var(--color-on-surface-variant);margin-bottom:4px">${s.credits?`${s.credits} credits · `:''}${totalSlots} slot${totalSlots!==1?'s':''} available</div>
      ${teacherList}
    </div>`;
  }).join('');

  return `<div class="glass-card fade-in">
    <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
      <h2 class="text-title-lg">Step 2 · Select Your Subjects</h2>
      <span class="badge badge-success">${subjects.length} subjects found</span>
    </div>
    <p id="sel-count" class="text-muted mb-3" style="font-size:13px">0 selected — click to select</p>
    <input id="subj-search" class="form-input mb-3" placeholder="🔍 Search by name or code..." style="font-size:14px">
    <div id="subj-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;max-height:440px;overflow-y:auto;padding:4px;margin-bottom:16px">
      ${cards}
    </div>
    <div class="flex justify-between items-center flex-wrap gap-2" style="border-top:1px solid var(--border-color);padding-top:14px">
      <button class="btn btn-secondary" id="back-1">← Back</button>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm" id="sel-all">Select All</button>
        <button class="btn btn-ghost btn-sm" id="clr-all">Clear</button>
        <button class="btn btn-primary" id="s2b" disabled>Set Preferences →</button>
      </div>
    </div>
  </div>`;
}

/**
 * Step 3: Preferences — leave day, avoid times, staff picker, slot picker per subject
 * @param {string}   leaveDay
 * @param {string[]} avoidSlots
 * @param {Array}    selectedSubjects  — the full subject objects user selected
 * @param {Object}   staffPrefs        — { subjectCode: staffName }
 * @param {Object}   slotPrefs         — { subjectCode: slotName }
 */
export function renderStep3(leaveDay, avoidSlots, selectedSubjects, staffPrefs, slotPrefs) {
  const dayOpts = [...DAYS, 'None'];

  // Build per-subject staff+slot pickers
  const subjectPickers = (selectedSubjects||[]).map((s, i) => {
    const c    = getSubjectColor(i);
    const key  = s.subject_code || s.subject_name;

    // Collect all unique staff names for this subject
    const allStaff = [...new Set((s.teachers||[]).map(t => t.staff_name).filter(Boolean))];

    // Current staff pref (or 'Any')
    const curStaff = staffPrefs[key] || 'Any';

    // Get slots for the selected staff (or all slots if 'Any')
    const relevantTeachers = curStaff === 'Any'
      ? (s.teachers||[])
      : (s.teachers||[]).filter(t => t.staff_name === curStaff);
    const allSlots = relevantTeachers.flatMap(t => (t.slots||[]).map(sl => ({
      slot_name: sl.slot_name,
      staff: t.staff_name,
      days: (sl.classes||[]).map(c => `${c.day.slice(0,3)} ${c.time}`).join(', ')
    })));

    const curSlot = slotPrefs[key] || 'Any';

    const staffOptions = ['Any', ...allStaff].map(st =>
      `<option value="${st}" ${curStaff===st?'selected':''}>${st}</option>`
    ).join('');

    const slotOptions = ['Any', ...allSlots.map(sl => sl.slot_name)].map(sn => {
      const info = allSlots.find(sl => sl.slot_name === sn);
      const label = sn === 'Any' ? 'Any Slot' : `${sn}${info?' — '+info.days:''}`;
      return `<option value="${sn}" ${curSlot===sn?'selected':''}>${label}</option>`;
    }).join('');

    return `<div style="padding:14px;border-radius:var(--radius-lg);border:2px solid ${c}44;background:var(--bg-primary);margin-bottom:10px">
      <div style="font-weight:700;font-size:14px;color:${c};margin-bottom:10px">
        ${s.subject_name} <span style="font-size:11px;opacity:0.7">${s.subject_code||''}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--color-on-surface-variant);display:block;margin-bottom:4px">👤 Preferred Staff</label>
          <select class="form-input staff-pref" data-key="${key}" style="font-size:13px;padding:8px 10px">
            ${staffOptions}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--color-on-surface-variant);display:block;margin-bottom:4px">🎫 Specific Slot</label>
          <select class="form-input slot-pref" data-key="${key}" style="font-size:13px;padding:8px 10px">
            ${slotOptions}
          </select>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<div class="glass-card fade-in">
    <h2 class="text-title-lg mb-2">Step 3 · Preferences</h2>
    <p class="text-muted mb-5" style="font-size:13px">All fields are optional — leave as "Any" for automatic best selection.</p>

    <h3 class="text-title mb-3">🏖️ Leave Day</h3>
    <div class="flex gap-2 flex-wrap mb-5">
      ${dayOpts.map(d => `<label style="padding:10px 16px;border-radius:var(--radius-lg);border:2px solid ${leaveDay===d?'var(--color-primary)':'var(--border-color)'};background:${leaveDay===d?'var(--primary-container)':'transparent'};cursor:pointer;transition:all 0.2s;font-weight:600;font-size:13px">
        <input type="radio" name="ld" value="${d}" ${leaveDay===d?'checked':''} style="display:none">${d}
      </label>`).join('')}
    </div>

    <h3 class="text-title mb-3">⏰ Avoid Time Slots</h3>
    <div class="flex flex-wrap gap-3 mb-5">
      ${TIMES.map(t => {
        const on = avoidSlots.includes(t);
        return `<button class="avoid-btn" data-t="${t}" style="padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;border:2px solid ${on?'var(--color-danger)':'var(--border-color)'};background:${on?'rgba(220,38,38,0.12)':'transparent'};color:${on?'var(--color-danger)':'inherit'};cursor:pointer;transition:all 0.2s">${TIME_LABELS[t]}${on?' ✕':''}</button>`;
      }).join('')}
    </div>

    ${selectedSubjects&&selectedSubjects.length ? `
    <h3 class="text-title mb-3">👤 Staff & Slot Preferences</h3>
    <p class="text-muted mb-3" style="font-size:12px">Pin a specific staff or slot for any subject. The scheduler will lock that choice.</p>
    <div style="max-height:360px;overflow-y:auto;padding-right:4px">
      ${subjectPickers}
    </div>` : ''}

    <div class="flex justify-between mt-5">
      <button class="btn btn-secondary" id="back-2">← Back</button>
      <button class="btn btn-primary" id="s3b">🚀 Generate Timetable</button>
    </div>
  </div>`;
}

export function renderStep4() {
  return `<div class="glass-card fade-in" style="text-align:center;padding:60px 20px">
    <div style="width:52px;height:52px;border:4px solid rgba(255,255,255,0.1);border-top-color:var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 24px"></div>
    <h2 class="text-title-lg mb-2">Building Your Timetable</h2>
    <p class="text-muted">Constraint solver running — finding optimal clash-free slots...</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>`;
}

export function renderStep5(results, selectedSubjects, leaveDay, clashWarning) {
  if (!results || !results.length) {
    return `<div class="glass-card fade-in">
      <h2 class="text-title-lg mb-4">❌ No Valid Timetable Found</h2>
      <p class="text-muted mb-4">No conflict-free schedule found. Try removing avoid-slots or leave day.</p>
      <button class="btn btn-secondary" id="back-3">← Adjust Preferences</button>
    </div>`;
  }

  const best = results[0];
  const grid = best.grid;

  const colorMap = {};
  (selectedSubjects||[]).forEach((s, i) => { colorMap[s.subject_code||s.subject_name] = getSubjectColor(i); });
  const findColor = (name, code) => colorMap[code] || colorMap[name] || '#6366f1';

  const headerCells = TIMES.map(t =>
    `<th style="padding:10px 6px;text-align:center;font-weight:700;font-size:12px;background:var(--bg-secondary);border:1px solid var(--border-color)">${TIME_LABELS[t]}</th>`
  ).join('');

  let hasAnyData = false;
  DAYS.forEach(d => TIMES.forEach(t => { if (grid[d]?.[t]) hasAnyData = true; }));

  const rows = DAYS.map(day => {
    const isLeave = day === leaveDay;
    const cells = TIMES.map(time => {
      const cell = grid[day]?.[time];
      if (!cell) return `<td style="padding:4px;border:1px solid var(--border-color)"><div style="height:76px;display:flex;align-items:center;justify-content:center;color:var(--color-on-surface-variant);font-size:13px;background:var(--bg-secondary)">—</div></td>`;
      const c = findColor(cell.subject_name, cell.subject_code);
      return `<td style="padding:4px;border:1px solid var(--border-color)">
        <div style="background:${c};color:#fff;padding:8px 5px;border-radius:6px;min-height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:3px">
          <div style="font-size:11px;font-weight:700;line-height:1.2">${cell.subject_name}</div>
          <div style="background:rgba(255,255,255,0.25);padding:1px 8px;border-radius:20px;font-size:10px;font-weight:700;font-family:monospace">${cell.slot_name}</div>
          <div style="font-size:10px;opacity:0.9">${cell.staff_name||'TBA'}</div>
        </div>
      </td>`;
    }).join('');
    return `<tr style="${isLeave?'opacity:0.3':''}">
      <td style="padding:8px 12px;font-weight:700;font-size:12px;white-space:nowrap;border:1px solid var(--border-color);background:var(--bg-secondary)">${day.slice(0,3)}${isLeave?' 🏖️':''}</td>${cells}
    </tr>`;
  }).join('');

  const breakdown = Object.keys(best.assignment||{}).map((key, idx) => {
    const opt = best.assignment[key];
    const c   = findColor(opt.subject_name, opt.subject_code);
    const hasClasses = opt.classes?.length > 0;
    const scheduleRows = DAYS.map(d => {
      const cls = hasClasses ? (opt.classes||[]).find(cl => cl.day===d) : null;
      return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-color)">
        <span style="font-weight:600;font-size:12px;color:var(--color-on-surface-variant)">${d}</span>
        <span style="font-size:12px">${cls?`<strong>${cls.time}</strong>`:'—'}</span>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:14px;border-radius:var(--radius-lg);border:1px solid var(--border-color);overflow:hidden">
      <div style="background:${c};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div style="color:#fff;font-weight:700;font-size:15px">${idx+1}. ${opt.subject_name||'Unknown'}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px">${opt.subject_code||''} · ${opt.credits||'?'} cr</div>
        </div>
        <div style="text-align:right">
          <div style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 14px;border-radius:20px;font-weight:700;font-size:14px;font-family:monospace">🎫 ${opt.slot_name}</div>
          <div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:3px">${opt.staff_name||'TBA'}</div>
        </div>
      </div>
      <div style="padding:12px 16px;background:var(--bg-primary)">
        ${hasClasses ? scheduleRows : '<div style="color:var(--color-danger);font-size:12px;padding:4px 0">⚠️ No class data. Please re-parse your timetable text.</div>'}
      </div>
    </div>`;
  }).join('');

  // Print styles embedded
  const printCss = `<style id="print-styles">
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body > *:not(#print-root) { display: none !important; }
      #print-root { display: block !important; position: static !important; }
      .no-print { display: none !important; }
      #printable-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
      table { page-break-inside: avoid; }
    }
  </style>`;

  return `${printCss}<div class="glass-card fade-in" id="printable-area">
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2 no-print">
      <h2 class="text-title-lg">✅ Your Optimal Timetable</h2>
      <div class="flex gap-2 flex-wrap">
        ${results.length>1?`<select id="alt-select" class="form-input" style="width:auto;font-size:12px">${results.map((r,i)=>`<option value="${i}">Option ${i+1} — Score ${r.score}</option>`).join('')}</select>`:''}
        <button class="btn btn-secondary btn-sm no-print" id="regen-btn">🔄 Regenerate</button>
        <button class="btn btn-primary btn-sm no-print" id="print-btn">🖨️ Print</button>
        <button class="btn btn-primary btn-sm" id="save-btn">💾 Save</button>
      </div>
    </div>

    ${!hasAnyData?`<div style="background:rgba(247,37,133,0.1);border:1px solid rgba(247,37,133,0.3);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:16px;font-size:13px">
      ⚠️ <strong>Grid is empty</strong> — class timing data not found. Please go back and re-parse your timetable text.
      <button class="btn btn-secondary btn-sm no-print" style="margin-left:12px" id="back-3">← Go Back</button>
    </div>`:''}

    ${clashWarning?`<div class="no-print" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.4);color:#b45309;border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.5">
      ${clashWarning}
    </div>`:''}

    <div id="print-section">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:10px">📅 Weekly Timetable</h3>
      <div style="overflow-x:auto;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse;min-width:560px">
          <thead><tr>
            <th style="padding:10px 12px;text-align:left;font-weight:700;font-size:12px;background:var(--bg-secondary);border:1px solid var(--border-color)">Day</th>
            ${headerCells}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <h3 style="font-size:14px;font-weight:700;margin-bottom:8px">📋 Selected Slots</h3>
      <p style="font-size:12px;color:var(--color-on-surface-variant);margin-bottom:14px">Your pinned slot for each subject with the full weekly schedule.</p>
      ${breakdown||'<div class="text-muted">No subjects assigned.</div>'}
    </div>

    <div class="flex justify-between mt-6 no-print">
      <button class="btn btn-secondary" id="back-3">← Adjust Preferences</button>
      <button class="btn btn-ghost btn-sm" id="new-btn">🔄 Start Over</button>
    </div>
  </div>`;
}
