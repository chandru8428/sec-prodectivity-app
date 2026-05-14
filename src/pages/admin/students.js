import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, query, where } from '/src/firebase.js';
import { showToast } from '../../main.js';

export function render(root) {
  const layout = createLayout('All Students', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">👥 All Students</h1>
      <p class="page-subtitle">Browse and manage student profiles registered in EduSync.</p>
    </div>

    <div class="flex gap-4 mb-6 flex-wrap">
      <div class="search-bar" style="max-width:320px">
        <span class="search-icon">🔍</span>
        <input type="text" id="student-search" placeholder="Search by name or register number..." />
      </div>
      <select class="form-select" id="dept-filter" style="width:220px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Departments</option>
        <option>Computer Science & Engineering</option>
        <option>Information Technology</option>
        <option>Electronics & Communication Engineering</option>
        <option>Artificial Intelligence & Data Science</option>
      </select>
      <select class="form-select" id="sem-filter2" style="width:140px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Semesters</option>
        ${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" id="refresh-students">🔄 Refresh</button>
    </div>

    <!-- Stats -->
    <div class="grid grid-4 gap-4 mb-6" id="student-stats">
      <div class="stat-card"><div class="stat-value" id="total-students">—</div><div class="stat-label">Total Students</div></div>
      <div class="stat-card"><div class="stat-value" style="background:var(--gradient-success);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="active-students">—</div><div class="stat-label">Active (With Exams)</div></div>
      <div class="stat-card"><div class="stat-value" style="background:var(--gradient-warning);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="sem-count">—</div><div class="stat-label">Departments</div></div>
      <div class="stat-card"><div class="stat-value" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="today-joined">—</div><div class="stat-label">Joined Today</div></div>
    </div>

    <!-- Table -->
    <div class="glass-card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-title">Student Directory</h2>
        <span class="badge badge-primary" id="filtered-count">0 students</span>
      </div>
      <div class="table-wrapper" style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Register No.</th><th>Email</th><th>Department</th><th>Semester</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="students-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  let allStudents = [];

  async function load() {
    const tbody = main.querySelector('#students-tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-on-surface-variant)">Loading students...</td></tr>';
    try {
      const q = query(collection(db, 'users'), where('role','==','student'));
      const snap = await getDocs(q);
      allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      main.querySelector('#total-students').textContent = allStudents.length;
      const depts = new Set(allStudents.map(s => s.department).filter(Boolean));
      main.querySelector('#sem-count').textContent = depts.size;

      const today = new Date().toLocaleDateString();
      const todayJoined = allStudents.filter(s => new Date(s.createdAt).toLocaleDateString() === today).length;
      main.querySelector('#today-joined').textContent = todayJoined;
      main.querySelector('#active-students').textContent = allStudents.filter(s => s.registerNumber).length;

      renderStudents();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger"><span>⚠️</span><span>${err.message}</span></div></td></tr>`;
    }
  }

  function renderStudents() {
    const search  = main.querySelector('#student-search').value.toLowerCase();
    const dept    = main.querySelector('#dept-filter').value;
    const sem     = main.querySelector('#sem-filter2').value;

    let filtered = allStudents.filter(s => {
      const matchSearch = !search || s.name?.toLowerCase().includes(search) || s.registerNumber?.includes(search);
      const matchDept   = !dept || s.department === dept;
      const matchSem    = !sem  || String(s.semester) === sem;
      return matchSearch && matchDept && matchSem;
    });

    main.querySelector('#filtered-count').textContent = `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`;
    const tbody = main.querySelector('#students-tbody');

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-on-surface-variant)">No students found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((s, i) => {
      const initials = s.name ? s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?';
      const joined   = s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="user-avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0">${initials}</div>
              <span style="font-weight:600">${s.name || '—'}</span>
            </div>
          </td>
          <td><span class="badge badge-primary">${s.registerNumber || '—'}</span></td>
          <td style="font-size:11px;color:var(--color-on-surface-variant)">${s.email || '—'}</td>
          <td style="font-size:12px;max-width:160px" class="truncate">${s.department || '—'}</td>
          <td style="text-align:center">${s.semester ? `Sem ${s.semester}` : '—'}</td>
          <td style="font-size:11px;color:var(--color-on-surface-variant)">${joined}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="viewStudentExams('${s.registerNumber}')">📅 Exams</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Search debounce
  let st;
  main.querySelector('#student-search').addEventListener('input', () => { clearTimeout(st); st = setTimeout(renderStudents, 300); });
  main.querySelector('#dept-filter').addEventListener('change', renderStudents);
  main.querySelector('#sem-filter2').addEventListener('change', renderStudents);
  main.querySelector('#refresh-students').addEventListener('click', load);

  window.viewStudentExams = async function(regNum) {
    if (!regNum) return showToast('No register number', 'warning');
    showToast(`Viewing exams for ${regNum}...`, 'info');
    window.location.hash = '#/admin/upload-timetable';
    setTimeout(() => {
      const filterEl = document.querySelector('#filter-reg');
      if (filterEl) { filterEl.value = regNum; filterEl.dispatchEvent(new Event('input')); }
    }, 500);
  };

  load();
}
