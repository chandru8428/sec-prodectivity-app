/**
 * AI Schedule Crafter — 5-Step Wizard (Hybrid Regex + AI Fallback)
 */
import { createLayout } from '../../components/sidebar.js';
import { appState, showToast } from '../../main.js';
import { db, collection, addDoc } from '/src/firebase.js';
import { pdfToText, aiRepairParse } from '../../services/timetable-ai.js';
import { preprocess } from '../../utils/timetable-preprocessor.js';
import { parseText } from '../../utils/timetable-regex-parser.js';
import { generateTimetables } from '../../utils/timetable-scheduler.js';
import { renderProgressBar, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5 } from '../../utils/timetable-wizard-ui.js';

const S_KEY = 'tt_wizard_v4';
const S_DEF = {
  step: 1, rawText: '', subjects: [], selected: [],
  leaveDay: 'None', avoidSlots: [],
  staffPrefs: {},   // { subjectKey: staffName | 'Any' }
  slotPrefs: {},    // { subjectKey: slotName  | 'Any' }
  results: null, confidence: 0, clashWarning: null
};
let S = { ...S_DEF };

function saveS() { try { localStorage.setItem(S_KEY, JSON.stringify(S)); } catch {} }
function loadS() { try { const r = localStorage.getItem(S_KEY); if (r) S = { ...S_DEF, ...JSON.parse(r) }; else S = { ...S_DEF }; } catch { S = { ...S_DEF }; } }
function resetS() { S = { ...S_DEF }; try { localStorage.removeItem(S_KEY); } catch {} }

let wizEl = null;
const $ = id => document.getElementById(id);

function nav(n) { S.step = n; saveS(); render_wizard(); }

export function render(root) {
  loadS();
  const layout = createLayout('AI Schedule Crafter', '', 'Student');
  root.appendChild(layout);
  wizEl = layout.querySelector('#page-main');
  render_wizard();
}

function render_wizard() {
  if (!wizEl) return;
  wizEl.innerHTML = renderProgressBar(S.step) + '<div id="wiz"></div>';
  const wiz = $('wiz');
  if (!wiz) return;
  switch (S.step) {
    case 1: wireStep1(wiz); break;
    case 2: wireStep2(wiz); break;
    case 3: wireStep3(wiz); break;
    case 4: wireStep4(wiz); break;
    case 5: wireStep5(wiz); break;
    default: nav(1);
  }
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function wireStep1(wiz) {
  wiz.innerHTML = renderStep1(S.rawText);

  $('t-txt').onclick = () => { $('a-txt').classList.remove('hidden'); $('a-pdf').classList.add('hidden'); $('t-txt').classList.add('active'); $('t-pdf').classList.remove('active'); };
  $('t-pdf').onclick = () => { $('a-pdf').classList.remove('hidden'); $('a-txt').classList.add('hidden'); $('t-pdf').classList.add('active'); $('t-txt').classList.remove('active'); };
  $('inp')?.addEventListener('input', () => { S.rawText = $('inp').value; });
  $('pdf-inp').onchange = e => { const f = e.target.files[0]; if (f) { $('pdf-nm').style.display=''; $('pdf-nm').textContent=f.name; } };
  $('s1-reset').onclick = () => { if (confirm('Clear all data and start over?')) { resetS(); nav(1); showToast('Data cleared.','success'); } };

  $('s1b').onclick = async () => {
    const isPdf = !$('a-pdf').classList.contains('hidden');
    const btn = $('s1b'); const status = $('parse-status');
    btn.disabled = true; btn.textContent = '⏳ Parsing...';
    status.style.display = 'block';
    try {
      let rawText = '';
      if (isPdf) {
        const f = $('pdf-inp').files[0];
        if (!f) throw new Error('Please select a PDF file.');
        status.innerHTML = '<div class="alert" style="background:rgba(67,97,238,0.1);border:1px solid rgba(67,97,238,0.3);padding:12px">📄 Extracting text from PDF...</div>';
        rawText = await pdfToText(f);
      } else {
        rawText = $('inp')?.value?.trim() || '';
        if (!rawText) throw new Error('Please paste some timetable text.');
      }
      S.rawText = rawText;
      status.innerHTML = '<div class="alert" style="background:rgba(67,97,238,0.1);border:1px solid rgba(67,97,238,0.3);padding:12px">🔍 Running parser...</div>';
      const cleaned = preprocess(rawText);
      const { subjects, confidence } = parseText(cleaned);
      S.confidence = confidence;

      if (confidence < 85) {
        status.innerHTML = `<div style="background:rgba(247,37,133,0.1);border:1px solid rgba(247,37,133,0.3);padding:12px;border-radius:8px">⚡ Regex confidence: ${confidence}% — calling AI repair...</div>`;
        try {
          S.subjects = await aiRepairParse(rawText, subjects);
          showToast(`AI repaired ${S.subjects.length} subjects`,'info');
        } catch {
          S.subjects = subjects;
          showToast('AI fallback failed — using regex results.','warning');
        }
      } else {
        S.subjects = subjects;
        showToast(`✅ Parsed ${subjects.length} subjects (${confidence}% confidence)`,'success');
      }
      if (!S.subjects.length) throw new Error('No subjects found. Check your input format.');
      S.subjects = S.subjects.map(s => ({ ...s, confidence: s.confidence || confidence }));
      S.selected = []; S.staffPrefs = {}; S.slotPrefs = {};
      saveS(); nav(2);
    } catch (err) {
      status.innerHTML = `<div class="alert alert-danger" style="padding:12px">❌ ${err.message}</div>`;
      btn.disabled = false; btn.textContent = '⚡ Extract & Parse →';
    }
  };
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function wireStep2(wiz) {
  wiz.innerHTML = renderStep2(S.subjects);

  const updateChecks = () => {
    S.subjects.forEach((_, i) => {
      const el = $('chk-'+i); const card = el?.closest('.subj-card');
      if (!el||!card) return;
      const on = S.selected.includes(i);
      el.textContent = on ? '✓' : ''; el.style.background = on ? 'var(--color-primary)' : 'var(--bg-secondary)';
      el.style.color = on ? '#fff' : ''; el.style.borderColor = on ? 'var(--color-primary)' : 'var(--border-color)';
      card.style.borderColor = on ? 'var(--color-primary)' : 'var(--border-color)';
      card.style.background = on ? 'var(--primary-container)' : 'transparent';
    });
    const cnt = $('sel-count'); if (cnt) cnt.textContent = `${S.selected.length} of ${S.subjects.length} selected`;
    const btn = $('s2b'); if (btn) btn.disabled = !S.selected.length;
  };

  document.querySelectorAll('.subj-card').forEach(card => {
    card.onclick = () => {
      const idx = parseInt(card.dataset.idx);
      S.selected = S.selected.includes(idx) ? S.selected.filter(x=>x!==idx) : [...S.selected, idx];
      updateChecks();
    };
  });
  $('subj-search').oninput = e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.subj-card').forEach(card => {
      const s = S.subjects[parseInt(card.dataset.idx)];
      card.style.display = !q||(s.subject_name||'').toLowerCase().includes(q)||(s.subject_code||'').toLowerCase().includes(q) ? '' : 'none';
    });
  };
  $('sel-all').onclick = () => { S.selected = S.subjects.map((_,i)=>i); updateChecks(); };
  $('clr-all').onclick = () => { S.selected = []; updateChecks(); };
  $('back-1').onclick = () => nav(1);
  $('s2b').onclick = () => { saveS(); nav(3); };
  updateChecks();
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function wireStep3(wiz) {
  const selSubjects = S.selected.map(i => S.subjects[i]).filter(Boolean);
  wiz.innerHTML = renderStep3(S.leaveDay, S.avoidSlots, selSubjects, S.staffPrefs||{}, S.slotPrefs||{});

  // Leave day
  document.querySelectorAll('input[name="ld"]').forEach(r => {
    r.onchange = () => {
      S.leaveDay = r.value;
      document.querySelectorAll('input[name="ld"]').forEach(x => {
        const l = x.closest('label');
        l.style.border = `2px solid ${x.checked?'var(--color-primary)':'var(--border-color)'}`;
        l.style.background = x.checked ? 'var(--primary-container)' : 'transparent';
      });
    };
  });

  // Avoid times
  document.querySelectorAll('.avoid-btn').forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.t;
      const on = S.avoidSlots.includes(t);
      S.avoidSlots = on ? S.avoidSlots.filter(x=>x!==t) : [...S.avoidSlots, t];
      btn.style.borderColor = !on ? 'var(--color-danger)' : 'var(--border-color)';
      btn.style.background  = !on ? 'rgba(220,38,38,0.12)' : 'transparent';
      btn.style.color       = !on ? 'var(--color-danger)' : 'inherit';
      btn.textContent       = !on ? `${btn.dataset.t} ✕` : btn.dataset.t.replace(' ✕','');
      // Re-check actual text from TIME_LABELS
      const TL = {'8-10':'8–10 AM','10-12':'10–12 PM','1-3':'1–3 PM','3-5':'3–5 PM'};
      btn.textContent = S.avoidSlots.includes(t) ? `${TL[t]||t} ✕` : (TL[t]||t);
    };
  });

  // Staff pref dropdowns — when staff changes, re-render slot options
  document.querySelectorAll('.staff-pref').forEach(sel => {
    sel.onchange = () => {
      const key = sel.dataset.key;
      S.staffPrefs = { ...S.staffPrefs, [key]: sel.value };
      S.slotPrefs  = { ...S.slotPrefs,  [key]: 'Any' }; // reset slot when staff changes
      saveS();
      // Re-render step3 to refresh slot options
      wireStep3(wiz);
    };
  });

  // Slot pref dropdowns
  document.querySelectorAll('.slot-pref').forEach(sel => {
    sel.onchange = () => {
      const key = sel.dataset.key;
      S.slotPrefs = { ...S.slotPrefs, [key]: sel.value };
      saveS();
    };
  });

  $('back-2').onclick = () => nav(2);

  $('s3b').onclick = () => {
    saveS(); nav(4);
    setTimeout(() => {
      try {
        const prefs = {
          leaveDay: S.leaveDay,
          avoidSlots: S.avoidSlots,
          staffPrefs: S.staffPrefs || {},
          slotPrefs:  S.slotPrefs  || {},
        };
        let results = generateTimetables(selSubjects, prefs, 3);
        let clashWarning = null;

        if (results.length === 0) {
          const pinnedKeys = [...new Set([...Object.keys(prefs.staffPrefs), ...Object.keys(prefs.slotPrefs)])];
          let relaxed = false;
          
          // 1. Try relaxing one subject's staff/slot at a time
          for (const key of pinnedKeys) {
            if (prefs.staffPrefs[key] === 'Any' && prefs.slotPrefs[key] === 'Any') continue;
            const tPrefs = { ...prefs, staffPrefs: { ...prefs.staffPrefs }, slotPrefs: { ...prefs.slotPrefs } };
            delete tPrefs.staffPrefs[key]; delete tPrefs.slotPrefs[key];
            const r = generateTimetables(selSubjects, tPrefs, 3);
            if (r.length > 0) {
              const sName = selSubjects.find(s => s.subject_code === key || s.subject_name === key)?.subject_name || key;
              clashWarning = `<strong>Clash Detected!</strong> Your preference for <b>${sName}</b> conflicted with other constraints. We generated a recommended timetable by relaxing it.`;
              results = r; relaxed = true; break;
            }
          }
          
          // 2. Try relaxing ALL staff/slot prefs
          if (!relaxed && pinnedKeys.length > 0) {
            const r2 = generateTimetables(selSubjects, { ...prefs, staffPrefs: {}, slotPrefs: {} }, 3);
            if (r2.length > 0) {
              clashWarning = `<strong>Clash Detected!</strong> Multiple staff/slot preferences conflicted. We generated a recommended timetable by relaxing them.`;
              results = r2; relaxed = true;
            }
          }
          
          // 3. Try relaxing avoid slots
          if (!relaxed && prefs.avoidSlots.length > 0) {
            const r3 = generateTimetables(selSubjects, { ...prefs, avoidSlots: [], staffPrefs: {}, slotPrefs: {} }, 3);
            if (r3.length > 0) {
              clashWarning = `<strong>Clash Detected!</strong> Your "Avoid Time Slots" caused a conflict. We generated a recommended timetable by relaxing them.`;
              results = r3; relaxed = true;
            }
          }
          
          // 4. Try relaxing leave day
          if (!relaxed && prefs.leaveDay !== 'None') {
            const r4 = generateTimetables(selSubjects, { leaveDay: 'None', avoidSlots: [], staffPrefs: {}, slotPrefs: {} }, 3);
            if (r4.length > 0) {
              clashWarning = `<strong>Clash Detected!</strong> Your Leave Day (${prefs.leaveDay}) caused a conflict. We generated a recommended timetable without it.`;
              results = r4; relaxed = true;
            }
          }
          
          if (results.length === 0) {
             clashWarning = `<strong>Unresolvable Clash!</strong> Your selected subjects have unavoidable conflicts (e.g. overlapping mandatory slots). Please select a different combination.`;
          }
        }
        
        S.results = results; S.clashWarning = clashWarning; saveS(); nav(5);
      } catch (err) { showToast('Scheduling error: '+err.message,'error'); nav(3); }
    }, 300);
  };
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function wireStep4(wiz) { wiz.innerHTML = renderStep4(); }

// ── Step 5 ────────────────────────────────────────────────────────────────────
function wireStep5(wiz) {
  const selSubjects = S.selected.map(i => S.subjects[i]).filter(Boolean);
  wiz.innerHTML = renderStep5(S.results, selSubjects, S.leaveDay, S.clashWarning);

  // Alternate timetable selector
  $('alt-select')?.addEventListener('change', e => {
    const idx = parseInt(e.target.value);
    if (S.results[idx]) { [S.results[0],S.results[idx]] = [S.results[idx],S.results[0]]; wireStep5(wiz); }
  });

  // Regenerate
  $('regen-btn')?.addEventListener('click', () => {
    nav(4);
    setTimeout(() => {
      try {
        const results = generateTimetables(selSubjects, { leaveDay:S.leaveDay, avoidSlots:S.avoidSlots, staffPrefs:S.staffPrefs||{}, slotPrefs:S.slotPrefs||{} }, 3);
        S.results = results; saveS(); nav(5);
      } catch (err) { showToast('Error: '+err.message,'error'); nav(3); }
    }, 300);
  });

  // Print — inject a hidden print-only wrapper into body and print
  $('print-btn')?.addEventListener('click', () => {
    const content = document.getElementById('print-section')?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast('Popup blocked! Please allow popups to print.', 'error');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>My Timetable</title>
      <style>
        body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px; }
        th { background: #f0f0f0; font-weight: 700; }
        h3 { margin: 16px 0 8px; font-size: 15px; }
        div[style*="border-radius"] { page-break-inside: avoid; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2 style="margin-bottom:16px">My Weekly Timetable</h2>
      ${content}
      <script>setTimeout(()=>{window.print();window.close();},250);<\/script>
    </body></html>`);
    win.document.close();
  });

  // Save to Firestore
  $('save-btn')?.addEventListener('click', async () => {
    try {
      const best = S.results[0];
      await addDoc(collection(db, 'timetables'), {
        title: 'Weekly Schedule',
        schedule: best.grid,
        assignment: best.assignment,
        subjects: selSubjects.map(s => s.subject_name),
        leaveDay: S.leaveDay, avoidSlots: S.avoidSlots,
        score: best.score,
        createdBy: appState.userData?.uid || appState.userData?.email || 'unknown',
        createdAt: new Date().toISOString()
      });
      showToast('✅ Timetable saved!','success');
    } catch (e) { showToast(e.message,'error'); }
  });

  $('back-3')?.addEventListener('click', () => nav(3));
  $('new-btn')?.addEventListener('click', () => { if (confirm('Start over?')) { resetS(); nav(1); } });
}
