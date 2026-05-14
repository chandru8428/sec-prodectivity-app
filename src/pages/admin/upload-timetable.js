import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, deleteDoc, doc, query, where, writeBatch, serverTimestamp } from '/src/supabase-adapter.js';
import { showToast } from '../../main.js';
import * as XLSX from 'xlsx';
import { getExamSchedules, clearExamSchedulesByType, deleteExamSchedule } from '../../services/firestore-service.js';

export function render(root) {
  const layout = createLayout('Upload Exam Timetable', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">📤 Upload Exam Timetable</h1>
      <p class="page-subtitle">Upload Theory and Practical exams separately to keep data clean and error-free.</p>
    </div>

    <!-- Two Upload Panels -->
    <div class="grid grid-2 gap-6 mb-6">

      <!-- Theory Upload -->
      <div class="glass-card" style="border:1px solid rgba(67,97,238,0.3)">
        <div class="flex items-center gap-3 mb-4">
          <div style="width:40px;height:40px;border-radius:var(--radius-lg);background:linear-gradient(135deg,#4361ee,#7209b7);display:flex;align-items:center;justify-content:center;font-size:20px">📝</div>
          <div>
            <h2 class="text-title">Theory Exam</h2>
            <div style="font-size:11px;color:var(--color-on-surface-variant)">Stored as <code>examType: theory</code></div>
          </div>
        </div>
        <div class="upload-zone" id="theory-zone" style="border-color:rgba(67,97,238,0.4)">
          <span class="upload-icon">📊</span>
          <div class="text-title mb-2">Drop Theory Excel/CSV here</div>
          <div class="text-muted text-body-sm mb-4">or click to browse</div>
          <button class="btn btn-primary" id="theory-browse-btn">Browse Files</button>
          <input type="file" id="theory-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
        </div>
        <div id="theory-preview-info" class="hidden mt-3">
          <div class="alert" style="background:rgba(67,97,238,0.1);border:1px solid rgba(67,97,238,0.3);color:var(--color-on-surface)">
            <span>📊</span>
            <span id="theory-preview-text"></span>
          </div>
          <div class="flex items-center gap-3 mt-3">
            <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-body-sm);cursor:pointer">
              <input type="checkbox" id="theory-clear-existing" style="accent-color:var(--color-danger)" />
              Clear existing theory data first
            </label>
            <button class="btn btn-primary" id="theory-upload-btn">⬆️ Upload Theory</button>
          </div>
        </div>
      </div>

      <!-- Practical Upload -->
      <div class="glass-card" style="border:1px solid rgba(0,163,200,0.3)">
        <div class="flex items-center gap-3 mb-4">
          <div style="width:40px;height:40px;border-radius:var(--radius-lg);background:linear-gradient(135deg,#00a3c8,#16a34a);display:flex;align-items:center;justify-content:center;font-size:20px">🧪</div>
          <div>
            <h2 class="text-title">Practical Exam</h2>
            <div style="font-size:11px;color:var(--color-on-surface-variant)">Stored as <code>examType: practical</code></div>
          </div>
        </div>
        <div class="upload-zone" id="practical-zone" style="border-color:rgba(0,163,200,0.4)">
          <span class="upload-icon">🧪</span>
          <div class="text-title mb-2">Drop Practical Excel/CSV here</div>
          <div class="text-muted text-body-sm mb-4">or click to browse</div>
          <button class="btn btn-secondary" id="practical-browse-btn">Browse Files</button>
          <input type="file" id="practical-file-input" accept=".xlsx,.xls,.csv" style="display:none" />
        </div>
        <div id="practical-preview-info" class="hidden mt-3">
          <div class="alert" style="background:rgba(0,163,200,0.1);border:1px solid rgba(0,163,200,0.3);color:var(--color-on-surface)">
            <span>🧪</span>
            <span id="practical-preview-text"></span>
          </div>
          <div class="flex items-center gap-3 mt-3">
            <label style="display:flex;align-items:center;gap:6px;font-size:var(--font-body-sm);cursor:pointer">
              <input type="checkbox" id="practical-clear-existing" style="accent-color:var(--color-danger)" />
              Clear existing practical data first
            </label>
            <button class="btn" style="background:linear-gradient(135deg,#00a3c8,#16a34a);color:#fff" id="practical-upload-btn">⬆️ Upload Practical</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Column Detection Info -->
    <div class="glass-card mb-6">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
        <div>
          <div style="font-weight:700;margin-bottom:6px">🔍 Auto-detected columns:</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;line-height:2">
            <span>📌 <b>Reg No</b> / Register Number</span>
            <span>📅 <b>Date</b> / Exam Date</span>
            <span>👤 <b>Name</b> / Student Name</span>
            <span>📚 <b>Subject Code</b> / Sub Code</span>
            <span>⏰ <b>Session</b> (FN / AN)</span>
            <span>📖 <b>Subject Name</b> / Subject</span>
            <span>🏛️ <b>Location</b> / Hall / Room</span>
          </div>
        </div>
        <div id="col-map-display" style="display:none">
          <div style="font-weight:700;margin-bottom:6px">✅ Last file detection result:</div>
          <div id="col-map-list" class="flex flex-col gap-1"></div>
        </div>
      </div>
    </div>

    <!-- Preview Table -->
    <div class="glass-card mb-6" id="preview-section" style="display:none">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-title">👁️ Preview — <span id="preview-type-badge"></span> (<span id="preview-count">0</span> rows)</h2>
      </div>
      <div class="table-wrapper" style="max-height:300px;overflow-y:auto">
        <table>
          <thead><tr>
            <th>Reg. No</th><th>Name</th><th>Date</th><th>Code</th><th>Session</th><th>Subject</th><th>Hall</th>
          </tr></thead>
          <tbody id="preview-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- Existing Schedules -->
    <div class="glass-card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-title">📋 Uploaded Schedules</h2>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" id="refresh-sched">🔄 Refresh</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:var(--color-danger);border:1px solid rgba(239,68,68,0.25)" id="clear-theory-btn">🗑️ Clear Theory</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:var(--color-danger);border:1px solid rgba(239,68,68,0.25)" id="clear-practical-btn">🗑️ Clear Practical</button>
          <button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:var(--color-danger);border:1px solid rgba(239,68,68,0.25)" id="clear-all-btn">🗑️ Clear All</button>
        </div>
      </div>

      <div class="flex gap-3 mb-4">
        <div class="search-bar" style="flex:1">
          <span class="search-icon">🔍</span>
          <input type="text" id="filter-reg" placeholder="Filter by register number..." />
        </div>
        <select class="form-select" id="filter-type" style="width:160px">
          <option value="">All Types</option>
          <option value="theory">📝 Theory</option>
          <option value="practical">🧪 Practical</option>
        </select>
      </div>

      <div id="schedules-list" class="flex flex-col gap-3">
        <div class="skeleton" style="height:60px;border-radius:var(--radius-lg)"></div>
        <div class="skeleton" style="height:60px;border-radius:var(--radius-lg)"></div>
        <div class="skeleton" style="height:60px;border-radius:var(--radius-lg)"></div>
      </div>
    </div>
  `;

  const parsedRows = { theory: [], practical: [] };

  // ── Setup upload zones ──
  setupUploadZone(main, 'theory', parsedRows);
  setupUploadZone(main, 'practical', parsedRows);

  // ── Upload buttons ──
  main.querySelector('#theory-upload-btn').addEventListener('click', () =>
    uploadRows(main, parsedRows.theory, 'theory', main.querySelector('#theory-clear-existing').checked, parsedRows)
  );
  main.querySelector('#practical-upload-btn').addEventListener('click', () =>
    uploadRows(main, parsedRows.practical, 'practical', main.querySelector('#practical-clear-existing').checked, parsedRows)
  );

  // ── Clear buttons (delete from Supabase with confirmation) ──
  main.querySelector('#clear-theory-btn').addEventListener('click', async () => {
    if (!confirm('⚠️ Delete ALL Theory exam schedules from database? This cannot be undone!')) return;
    try {
      showToast('Deleting theory exams...', 'info');
      await deleteByType('theory');
      // Clear local data
      parsedRows.theory = [];
      main.querySelector('#theory-preview-info').classList.add('hidden');
      main.querySelector('#preview-section').style.display = 'none';
      showToast('✅ All theory exams deleted from database', 'success');
      loadSchedules(main, '', '');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  });
  
  main.querySelector('#clear-practical-btn').addEventListener('click', async () => {
    if (!confirm('⚠️ Delete ALL Practical exam schedules from database? This cannot be undone!')) return;
    try {
      showToast('Deleting practical exams...', 'info');
      await deleteByType('practical');
      // Clear local data
      parsedRows.practical = [];
      main.querySelector('#practical-preview-info').classList.add('hidden');
      main.querySelector('#preview-section').style.display = 'none';
      showToast('✅ All practical exams deleted from database', 'success');
      loadSchedules(main, '', '');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  });
  
  main.querySelector('#clear-all-btn').addEventListener('click', async () => {
    if (!confirm('⚠️ Delete ALL exam schedules from database? This cannot be undone!')) return;
    try {
      showToast('Deleting all exams...', 'info');
      await deleteByType('');
      // Clear all local data
      parsedRows.theory = [];
      parsedRows.practical = [];
      main.querySelector('#theory-preview-info').classList.add('hidden');
      main.querySelector('#practical-preview-info').classList.add('hidden');
      main.querySelector('#preview-section').style.display = 'none';
      main.querySelector('#filter-reg').value = '';
      main.querySelector('#filter-type').value = '';
      showToast('✅ All exam schedules deleted from database', 'success');
      loadSchedules(main, '', '');
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  });

  // ── Filter ──
  let filterTimeout;
  const doFilter = () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      const reg  = main.querySelector('#filter-reg').value.trim();
      const type = main.querySelector('#filter-type').value;
      loadSchedules(main, reg, type);
    }, 400);
  };
  main.querySelector('#filter-reg').addEventListener('input', doFilter);
  main.querySelector('#filter-type').addEventListener('change', doFilter);
  main.querySelector('#refresh-sched').addEventListener('click', () => loadSchedules(main, '', ''));

  loadSchedules(main, '', '');
}

function setupUploadZone(main, type, parsedRows) {
  const zone  = main.querySelector(`#${type}-zone`);
  const input = main.querySelector(`#${type}-file-input`);
  const btn   = main.querySelector(`#${type}-browse-btn`);

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0], main, type, rows => { parsedRows[type] = rows; });
  });
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', e => {
    handleFile(e.target.files[0], main, type, rows => { parsedRows[type] = rows; });
  });
}

async function uploadRows(main, rows, type, clearFirst, parsedRows) {
  if (rows.length === 0) { showToast('No data to upload', 'error'); return; }
  const btn = main.querySelector(`#${type}-upload-btn`);
  btn.disabled = true;
  btn.textContent = 'Uploading...';

  try {
    if (clearFirst) {
      const regNums = [...new Set(rows.map(r => r.registerNumber))];
      for (const reg of regNums) {
        const q = query(collection(db, 'examSchedules'),
          where('registerNumber', '==', reg),
          where('examType', '==', type));
        const snap = await getDocs(q);
        for (const d of snap.docs) await deleteDoc(d.ref);
      }
    }

    const BATCH_SIZE = 499;
    let total = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      rows.slice(i, i + BATCH_SIZE).forEach(row => {
        const ref = doc(collection(db, 'examSchedules'));
        batch.set(ref, { ...row, examType: type, uploadedAt: serverTimestamp(), uploadedBy: 'admin' });
      });
      await batch.commit();
      total += Math.min(BATCH_SIZE, rows.length - i);
      btn.textContent = `Uploading... (${total}/${rows.length})`;
    }

    showToast(`✅ Uploaded ${total} ${type} exam records!`, 'success');
    parsedRows[type] = [];
    main.querySelector(`#${type}-preview-info`).classList.add('hidden');
    main.querySelector('#preview-section').style.display = 'none';
    loadSchedules(main, '', '');
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = type === 'theory' ? '⬆️ Upload Theory' : '⬆️ Upload Practical';
}

// Delete exams from database by type
async function deleteByType(type) {
  try {
    console.log('===== Starting delete for type:', type, '=====');
    
    // First verify what's in the database
    const allSchedules = await getExamSchedules();
    console.log('Total records in database:', allSchedules.length);
    
    if (allSchedules.length === 0) {
      showToast('No records to delete', 'info');
      return;
    }
    
    // Use the Firestore service to clear by type
    console.log('Calling clearExamSchedulesByType...');
    await clearExamSchedulesByType(type);
    console.log('clearExamSchedulesByType completed');
    
    // Verify deletion
    const remaining = await getExamSchedules();
    console.log('Remaining records after delete:', remaining.length);
    
    if (remaining.length === 0) {
      console.log('SUCCESS: All records deleted');
    }
    
  } catch (err) {
    console.error('===== Delete error:', err, '=====');
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const COL_ALIASES = {
  registerNumber: ['reg no','regno','register no','register number','registernumber','roll no','rollno','roll number','enrollment no','reg_no','reg.no','registration number','reg. no','reg.no.'],
  studentName:    ['name','student name','studentname','candidate name','full name','fullname','student_name'],
  examDate:       ['date','exam date','examdate','examination date','exam_date','date of exam'],
  subjectCode:    ['subject code','subjectcode','sub code','subcode','course code','subject_code','code','r 2019','r 2024','r2019','r2024','reg 2019','reg 2024','R 2019/R 2024','R 2019/R 2024','r 2019/r 2024','r 2019/r 2024'],
  session:        ['session','sess','fn/an','fn','an','slot','exam session','time slot'],
  subject:        ['subject name','subjectname','subject','course name','paper name','course','subject_name','paper'],
  hall:           ['location','hall','room','venue','exam hall','exam center','room no','hall no','exam venue'],
};

// Detect if a value looks like a register number (handles R2019/, R2024, R 2019, plain 212224xxxxxx etc.)
function looksLikeRegisterNumber(val) {
  if (!val) return false;
  const v = String(val).trim();
  // Patterns: R2019/..., R 2024..., R2024..., plain 12-digit numeric reg numbers
  return (
    /^R\s*20\d{2}[\/ ]/i.test(v) ||   // R2019/... or R 2024/...
    /^R\s*20\d{2}\d+/i.test(v) ||      // R20241234...
    /^\d{12,}$/.test(v)                 // plain numeric 12+ digit reg numbers
  );
}

function detectColumns(headers) {
  const normalized = {};
  headers.forEach(h => { normalized[h.trim().toLowerCase().replace(/_/g,' ').replace(/-/g,' ')] = h; });
  const map = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      if (normalized[alias]) { map[field] = normalized[alias]; break; }
    }
  }
  return map;
}

// After building the column map, sanity-check the first data row to fix misdetections
function sanityCheckColMap(colMap, rawRows) {
  if (!rawRows || rawRows.length === 0) return colMap;
  const fixed = { ...colMap };
  const sample = rawRows[0];

  // If subjectCode value looks like a register number, swap them
  if (fixed.subjectCode && !fixed.registerNumber) {
    const val = sample[fixed.subjectCode];
    if (looksLikeRegisterNumber(val)) {
      fixed.registerNumber = fixed.subjectCode;
      delete fixed.subjectCode;
    }
  }

  // If registerNumber value looks like a subject code (short alphanum, no R20xx prefix)
  if (fixed.registerNumber && !fixed.subjectCode) {
    const val = sample[fixed.registerNumber];
    if (val && !looksLikeRegisterNumber(val) && /^[A-Z0-9]{4,10}$/i.test(String(val).trim())) {
      fixed.subjectCode = fixed.registerNumber;
      delete fixed.registerNumber;
    }
  }

  return fixed;
}

function parseDate(val) {
  if (!val || String(val).trim() === '') return '';
  val = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const m1 = val.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    return new Date(Date.UTC(1899,11,30) + num*86400000).toISOString().split('T')[0];
  }
  return val;
}

function normalizeSession(val) {
  if (!val) return '';
  const v = String(val).trim().toUpperCase();
  if (v.includes('FN')||v.includes('FORE')||v.includes('MORN')||v.includes('AM')) return 'FN';
  if (v.includes('AN')||v.includes('AFTER')||v.includes('PM')) return 'AN';
  return v;
}

function sessionToTime(session) {
  if (session === 'FN') return ['10:00','13:00'];
  if (session === 'AN') return ['14:00','17:00'];
  return ['',''];
}

function mapRows(rawRows, colMap) {
  const get = (row, field) => {
    const col = colMap[field];
    if (!col) return '';
    const v = row[col];
    return v === undefined || v === null ? '' : String(v).trim();
  };
  return rawRows.map(row => {
    const reg = get(row,'registerNumber');
    if (!reg) return null;
    const session = normalizeSession(get(row,'session'));
    const [start,end] = sessionToTime(session);
    return {
      registerNumber: reg.toUpperCase(),
      studentName:    get(row,'studentName'),
      examDate:       parseDate(get(row,'examDate')),
      subjectCode:    get(row,'subjectCode').toUpperCase(),
      subject:        get(row,'subject'),
      session, startTime: start, endTime: end,
      hall:           get(row,'hall'),
    };
  }).filter(Boolean);
}

function handleFile(file, main, type, onParsed) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rawRows = [], headers = [];
      if (ext === 'csv') {
        const lines = e.target.result.trim().split('\n');
        headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
        rawRows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
          const obj = {};
          headers.forEach((h,i) => { obj[h] = vals[i]||''; });
          return obj;
        });
      } else {
        const wb = XLSX.read(e.target.result, { type:'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRows  = XLSX.utils.sheet_to_json(ws, { defval:'' });
        headers  = Object.keys(rawRows[0]||{});
      }

      const colMap = sanityCheckColMap(detectColumns(headers), rawRows);
      const rows   = mapRows(rawRows, colMap);

      // Show column detection
      const colDisplay = main.querySelector('#col-map-display');
      const colList    = main.querySelector('#col-map-list');
      colDisplay.style.display = '';
      const fields = ['registerNumber','studentName','examDate','subjectCode','session','subject','hall'];
      const icons  = { registerNumber:'📌',studentName:'👤',examDate:'📅',subjectCode:'📚',session:'⏰',subject:'📖',hall:'🏛️' };
      colList.innerHTML = fields.map(f => {
        const mapped = colMap[f];
        return `<div style="display:flex;align-items:center;gap:8px;font-size:11px">
          <span>${icons[f]}</span>
          <span style="min-width:110px;font-weight:600">${f}</span>
          ${mapped
            ? `<span style="color:var(--color-success)">✓ <span class="badge badge-success" style="font-size:9px">${mapped}</span></span>`
            : `<span style="color:var(--color-danger)">✗ not detected</span>`
          }
        </div>`;
      }).join('');

      // Show preview
      const previewSection = main.querySelector('#preview-section');
      previewSection.style.display = '';
      main.querySelector('#preview-type-badge').innerHTML = type === 'theory'
        ? '<span class="badge badge-primary">📝 Theory</span>'
        : '<span class="badge" style="background:rgba(0,163,200,0.2);color:#00a3c8">🧪 Practical</span>';
      main.querySelector('#preview-count').textContent = rows.length;
      main.querySelector('#preview-tbody').innerHTML = rows.slice(0,30).map(r => `
        <tr>
          <td><span class="badge badge-primary" style="font-size:10px">${r.registerNumber}</span></td>
          <td style="font-size:12px;font-weight:500">${r.studentName||'—'}</td>
          <td style="font-size:12px">${r.examDate||'—'}</td>
          <td><span class="badge badge-secondary" style="font-size:10px">${r.subjectCode||'—'}</span></td>
          <td style="text-align:center"><span class="badge ${r.session==='FN'?'badge-primary':'badge-warning'}" style="font-size:10px">${r.session||'—'}</span></td>
          <td style="font-size:12px;max-width:160px" class="truncate">${r.subject||'—'}</td>
          <td style="font-size:12px">${r.hall||'—'}</td>
        </tr>
      `).join('');

      // Show preview info panel
      const infoPanel = main.querySelector(`#${type}-preview-info`);
      infoPanel.classList.remove('hidden');
      main.querySelector(`#${type}-preview-text`).textContent = `✅ Parsed ${rows.length} rows from "${file.name}"${rows.length > 30 ? ' (showing 30)' : ''}`;

      onParsed(rows);
      showToast(`✅ ${rows.length} rows parsed from "${file.name}"`, 'success');
    } catch (err) {
      showToast('Failed to parse file: ' + err.message, 'error');
      console.error(err);
    }
  };
  if (ext === 'csv') reader.readAsText(file);
  else reader.readAsBinaryString(file);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────
async function loadSchedules(main, filterReg = '', filterType = '') {
  const container = main.querySelector('#schedules-list');
  container.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center;padding:var(--space-4)">Loading...</div>';
  try {
    // Use Firestore service
    let records = await getExamSchedules(filterReg, filterType);
    
    // Sort by date
    records = records.sort((a,b) => (a.examDate||'').localeCompare(b.examDate||''));

    if (records.length === 0) {
      container.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center;padding:var(--space-6)">No schedules found</div>';
      return;
    }

    container.innerHTML = records.slice(0,80).map(r => {
      const typeColor = r.examType === 'theory' ? 'rgba(67,97,238,0.2)' : 'rgba(0,163,200,0.2)';
      const typeIcon  = r.examType === 'theory' ? '📝' : '🧪';
      return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-lg);background:var(--color-surface-container-high);border-left:3px solid ${typeColor}">
        <span style="font-size:1.2rem">${typeIcon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:var(--font-body-sm)">${r.subject||r.subjectCode||'—'}</div>
          <div style="font-size:11px;color:var(--color-on-surface-variant)">
            <span class="badge badge-primary" style="font-size:9px">${r.registerNumber}</span>
            ${r.studentName ? `· ${r.studentName}` : ''}
            · ${r.examDate||'—'}
            ${r.session ? `· <span class="badge ${r.session==='FN'?'badge-primary':'badge-warning'}" style="font-size:9px">${r.session}</span>` : ''}
            · ${r.hall ? `Hall: ${r.hall}` : '—'}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);padding:4px 8px" onclick="deleteSchedule('${r.id}')">🗑️</button>
      </div>`;
    }).join('');

    if (records.length > 80) {
      container.innerHTML += `<div class="text-muted text-label-sm" style="text-align:center;margin-top:var(--space-2)">Showing 80 of ${records.length} — use filter to narrow</div>`;
    }
  } catch (err) {
    console.error('Load schedules error:', err);
    container.innerHTML = `<div class="alert alert-danger"><span>⚠️</span><span>${err.message}</span></div>`;
  }
}

window.deleteSchedule = async function(id) {
  if (!confirm('🗑️ Delete this exam record from database?')) return;
  try {
    await deleteExamSchedule(id);
    showToast('Record deleted from database', 'success');
    document.querySelector('#refresh-sched')?.click();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
};
