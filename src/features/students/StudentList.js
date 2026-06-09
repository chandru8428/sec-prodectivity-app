import { createLayout } from '../../components/layout/Sidebar.js';
import { db, collection, getDocs, query, where, deleteDoc, doc } from '../../lib/supabase-adapter.js';
import { supabase } from '../../lib/supabase.js';
import { showToast } from '../../app/main.js';

export function render(root) {
  const layout = createLayout('All Students', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text"><i data-lucide="users" class="icon-inline"></i> All Students</h1>
      <p class="page-subtitle">Browse and manage student profiles registered in EduSync.</p>
    </div>

    <!-- Confirm Delete Modal -->
    <div id="remove-user-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:#00000088;backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;">
      <div style="background:var(--surface);border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 24px 64px #0008;border:1px solid var(--border-color);animation:slideUp .2s ease;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:60px;height:60px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;"><i data-lucide="trash-2" class="icon-inline"></i></div>
          <h3 style="color:var(--on-surface);margin-bottom:6px;font-size:18px;">Remove Student?</h3>
          <p style="color:var(--on-surface-variant);font-size:13px;line-height:1.6;" id="remove-modal-msg">
            This will permanently delete the student's account and all their data. This cannot be undone.
          </p>
        </div>
        <div style="background:var(--surface-container);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--on-surface-variant);">Name</span>
            <strong id="modal-student-name" style="color:var(--on-surface);">—</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--on-surface-variant);">Register No.</span>
            <strong id="modal-student-reg" style="color:var(--on-surface);">—</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--on-surface-variant);">Email</span>
            <span id="modal-student-email" style="color:var(--on-surface);font-size:12px;">—</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <button class="btn btn-ghost flex-1" id="modal-cancel-btn">Cancel</button>
          <button class="btn flex-1" id="modal-confirm-btn"
            style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;">
            <i data-lucide="trash-2" class="icon-inline"></i> Yes, Remove
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-4 mb-6 flex-wrap">
      <div class="search-bar" style="max-width:320px">
        <span class="search-icon"><i data-lucide="search" class="icon-inline"></i></span>
        <input type="text" id="student-search" placeholder="Search by name or register number..." />
      </div>
      <select class="form-select" id="dept-filter" style="width:220px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Departments</option>
      </select>
      <select class="form-select" id="sem-filter2" style="width:140px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Semesters</option>
        ${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}
      </select>
      <select class="form-select" id="status-filter" style="width:140px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Statuses</option>
        <option value="active">Active (Has Reg No)</option>
        <option value="pending">Pending (No Reg No)</option>
      </select>
      <select class="form-select" id="exam-filter" style="width:140px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">All Exams</option>
        <option value="scheduled">Scheduled</option>
        <option value="none">Not Scheduled</option>
      </select>
      <select class="form-select" id="sort-filter" style="width:160px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
        <option value="">Sort By...</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="date-desc">Joined (Newest)</option>
        <option value="date-asc">Joined (Oldest)</option>
        <option value="exam-first">Exams First</option>
      </select>
      <button class="btn btn-ghost btn-sm" id="refresh-students"><i data-lucide="refresh-cw" class="icon-inline"></i> Refresh</button>
    </div>

    <!-- User Activity Modal -->
    <div id="user-activity-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:#00000088;backdrop-filter:blur(4px);align-items:center;justify-content:center;">
      <div style="background:var(--surface);border-radius:20px;padding:32px;max-width:420px;width:90%;box-shadow:0 24px 64px #0008;border:1px solid var(--border-color);animation:slideUp .2s ease;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;"><i data-lucide="bar-chart-3" class="icon-inline"></i></div>
          <h3 style="color:var(--on-surface);margin-bottom:6px;font-size:18px;">User Activity</h3>
          <p style="color:var(--on-surface-variant);font-size:13px;line-height:1.6;">
            Summary of <span id="activity-student-name" style="color:var(--on-surface);font-weight:600;">—</span>'s activities on EduSync.
          </p>
        </div>
        <div style="background:var(--surface-container);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px;" id="activity-stats-container">
          <div style="text-align:center;color:var(--on-surface-variant);">Loading activity...</div>
        </div>
        <button class="btn" style="width:100%" id="activity-close-btn">Close</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-4 gap-4 mb-6" id="student-stats">
      <div class="stat-card"><div class="stat-value" id="total-students">—</div><div class="stat-label">Total Students</div></div>
      <div class="stat-card"><div class="stat-value" style="background:var(--gradient-success);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text" id="active-students">—</div><div class="stat-label">Active (With Reg No.)</div></div>
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
  let pendingRemoveId = null;

  /* ── Load students ── */
  async function load() {
    const tbody = main.querySelector('#students-tbody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-on-surface-variant)">Loading students...</td></tr>';
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);

      const scheduledRegNums = new Set();
      let hasMore = true;
      let fromIdx = 0;
      let stepSize = 1000;
      while (hasMore) {
        const { data, error } = await supabase.from('examSchedules').select('registerNumber, uploadedBy').range(fromIdx, fromIdx + stepSize - 1);
        if (error || !data) break;
        data.forEach(d => {
          if (d.registerNumber && d.uploadedBy !== 'student') scheduledRegNums.add(String(d.registerNumber));
        });
        if (data.length < stepSize) hasMore = false;
        fromIdx += stepSize;
      }

      allStudents = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          hasExams: !!data.registerNumber && scheduledRegNums.has(String(data.registerNumber)),
          ...data
        };
      });

      main.querySelector('#total-students').textContent = allStudents.length;
      const depts = new Set(allStudents.map(s => s.department).filter(Boolean));
      main.querySelector('#sem-count').textContent = depts.size;

      // Populate department dropdown dynamically
      const deptSelect = main.querySelector('#dept-filter');
      const currentDept = deptSelect.value;
      deptSelect.innerHTML = '<option value="">All Departments</option>';
      Array.from(depts).sort().forEach(d => {
        deptSelect.innerHTML += `<option value="${d}">${d}</option>`;
      });
      if (depts.has(currentDept)) {
        deptSelect.value = currentDept;
      }

      const today = new Date().toLocaleDateString();
      const todayJoined = allStudents.filter(s => new Date(s.createdAt).toLocaleDateString() === today).length;
      main.querySelector('#today-joined').textContent = todayJoined;
      main.querySelector('#active-students').textContent = allStudents.filter(s => s.registerNumber).length;

      renderStudents();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger"><span><i data-lucide="alert-triangle" class="icon-inline"></i>️</span><span>${err.message}</span></div></td></tr>`;
    }
  }

  /* ── Render filtered table ── */
  function renderStudents() {
    const search = main.querySelector('#student-search').value.toLowerCase();
    const dept   = main.querySelector('#dept-filter').value;
    const sem    = main.querySelector('#sem-filter2').value;
    const status = main.querySelector('#status-filter').value;
    const examF  = main.querySelector('#exam-filter').value;

    let filtered = allStudents.filter(s => {
      const matchSearch = !search || s.name?.toLowerCase().includes(search) || s.registerNumber?.includes(search);
      const matchDept   = !dept || s.department === dept;
      const matchSem    = !sem  || String(s.semester) === sem;
      
      let matchStatus = true;
      if (status === 'active') matchStatus = !!s.registerNumber;
      if (status === 'pending') matchStatus = !s.registerNumber;

      let matchExam = true;
      if (examF === 'scheduled') matchExam = s.hasExams;
      if (examF === 'none') matchExam = !s.hasExams;

      return matchSearch && matchDept && matchSem && matchStatus && matchExam;
    });

    const sortVal = main.querySelector('#sort-filter').value;
    if (sortVal === 'name-asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortVal === 'name-desc') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortVal === 'date-desc') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortVal === 'date-asc') {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortVal === 'exam-first') {
      filtered.sort((a, b) => (b.hasExams === a.hasExams) ? 0 : b.hasExams ? 1 : -1);
    }

    main.querySelector('#filtered-count').textContent = `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`;
    const tbody = main.querySelector('#students-tbody');

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--color-on-surface-variant)">No students found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((s, i) => {
      const initials = s.name ? s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
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
            <div class="flex gap-1">
              ${s.hasExams ? `<button class="btn btn-secondary btn-sm" onclick="viewStudentExams('${s.registerNumber}')"><i data-lucide="calendar" class="icon-inline"></i> Exams</button>` : ''}
              <button class="btn btn-sm" onclick="openActivityModal('${s.id}')"
                style="background:var(--primary-container);color:var(--primary);border:1px solid var(--primary-container);font-size:11px"
                title="View student activity">
                <i data-lucide="bar-chart-3" class="icon-inline"></i> Activity
              </button>
              <button class="btn btn-sm" onclick="openRemoveModal('${s.id}')"
                style="background:#fee2e233;color:#dc2626;border:1px solid #fca5a533;font-size:11px"
                title="Remove this student">
                <i data-lucide="trash-2" class="icon-inline"></i> Remove
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ── Remove modal logic ── */
  const modal = main.querySelector('#remove-user-modal');

  window.openRemoveModal = function(userId) {
    const student = allStudents.find(s => s.id === userId);
    if (!student) return;
    pendingRemoveId = userId;
    main.querySelector('#modal-student-name').textContent  = student.name || '—';
    main.querySelector('#modal-student-reg').textContent   = student.registerNumber || '—';
    main.querySelector('#modal-student-email').textContent = student.email || '—';
    modal.style.display = 'flex';
  };

  main.querySelector('#modal-cancel-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    pendingRemoveId = null;
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.style.display = 'none'; pendingRemoveId = null; }
  });

  main.querySelector('#modal-confirm-btn').addEventListener('click', async () => {
    if (!pendingRemoveId) return;
    const btn = main.querySelector('#modal-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="hourglass" class="icon-inline"></i> Removing...';

    const student = allStudents.find(s => s.id === pendingRemoveId);

    try {
      // 1. Delete associated data from all tables
      
      // Attendance
      const attSnap = await getDocs(collection(db, 'users', pendingRemoveId, 'attendance'));
      for (const d of attSnap.docs) await deleteDoc(d.ref);

      // GPA (Firebase)
      const gpaSnap = await getDocs(collection(db, 'users', pendingRemoveId, 'gpa'));
      for (const d of gpaSnap.docs) await deleteDoc(d.ref);

      // GPA (Supabase)
      await supabase.from('gpa_subjects').delete().eq('user_id', pendingRemoveId);

      // Exam Schedules
      if (student && student.registerNumber) {
        const esSnap = await getDocs(query(collection(db, 'examSchedules'), where('registerNumber', '==', student.registerNumber)));
        for (const d of esSnap.docs) await deleteDoc(d.ref);
      }

      // Timetables
      const ttSnap = await getDocs(query(collection(db, 'timetables'), where('createdBy', '==', pendingRemoveId)));
      for (const d of ttSnap.docs) await deleteDoc(d.ref);

      // Posts
      const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', pendingRemoveId)));
      for (const d of postsSnap.docs) await deleteDoc(d.ref);

      // 2. Delete from Supabase 'users' table
      await deleteDoc(doc(db, 'users', pendingRemoveId));

      // 3. Remove from local list & re-render
      allStudents = allStudents.filter(s => s.id !== pendingRemoveId);

      // Update stats
      main.querySelector('#total-students').textContent = allStudents.length;
      const depts = new Set(allStudents.map(s => s.department).filter(Boolean));
      main.querySelector('#sem-count').textContent = depts.size;
      main.querySelector('#active-students').textContent = allStudents.filter(s => s.registerNumber).length;

      renderStudents();
      showToast('<i data-lucide="check-circle-2" class="icon-inline"></i> Student removed successfully', 'success');
    } catch (err) {
      showToast('<i data-lucide="x-circle" class="icon-inline"></i> Failed to remove: ' + err.message, 'error');
    }

    modal.style.display = 'none';
    pendingRemoveId = null;
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="trash-2" class="icon-inline"></i> Yes, Remove';
  });

  /* ── Search / filter ── */
  let st;
  main.querySelector('#student-search').addEventListener('input', () => { clearTimeout(st); st = setTimeout(renderStudents, 300); });
  main.querySelector('#dept-filter').addEventListener('change', renderStudents);
  main.querySelector('#sem-filter2').addEventListener('change', renderStudents);
  main.querySelector('#status-filter').addEventListener('change', renderStudents);
  main.querySelector('#exam-filter').addEventListener('change', renderStudents);
  main.querySelector('#sort-filter').addEventListener('change', renderStudents);
  main.querySelector('#refresh-students').addEventListener('click', load);

  /* ── Activity modal logic ── */
  const activityModal = main.querySelector('#user-activity-modal');

  window.openActivityModal = async function(userId) {
    const student = allStudents.find(s => s.id === userId);
    if (!student) return;
    main.querySelector('#activity-student-name').textContent = student.name || '—';
    activityModal.style.display = 'flex';
    
    const container = main.querySelector('#activity-stats-container');
    container.innerHTML = '<div style="text-align:center;color:var(--on-surface-variant);">Loading activity...</div>';

    try {
      const attSnap = await getDocs(collection(db, 'users', userId, 'attendance'));
      const gpaSnap = await getDocs(collection(db, 'users', userId, 'gpa'));
      const ttSnap = await getDocs(query(collection(db, 'timetables'), where('createdBy', '==', userId)));
      let postsCount = 0;
      try {
        const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', userId)));
        postsCount = postsSnap.docs.length;
      } catch { /* ignore */ }

      let cgpaDisplay = '—';
      let totalGpaSubjects = 0;
      
      const { data: sbGpa } = await supabase.from('gpa_subjects').select('*').eq('user_id', student.id);
      
      if (!gpaSnap.empty || (sbGpa && sbGpa.length > 0)) {
        let tCredits = 0, tWeighted = 0;
        let seenSubjects = new Set();
        
        const processSubject = (subj, cred, pts) => {
          if (seenSubjects.has(subj)) return;
          seenSubjects.add(subj);
          tCredits += (cred || 0);
          tWeighted += (cred || 0) * (pts || 0);
          totalGpaSubjects++;
        };

        if (!gpaSnap.empty) {
          gpaSnap.docs.forEach(d => {
            const r = d.data();
            processSubject(r.subject, r.credits, r.points);
          });
        }
        
        if (sbGpa) {
          sbGpa.forEach(r => {
            processSubject(r.subject, r.credits, r.points);
          });
        }
        
        if (tCredits > 0) cgpaDisplay = (tWeighted / tCredits).toFixed(2);
      }

      let examCount = 0;
      if (student.registerNumber) {
        try {
          const esSnap = await getDocs(query(collection(db, 'examSchedules'), where('registerNumber', '==', student.registerNumber)));
          examCount = esSnap.docs.length;
        } catch { /* ignore if blocked */ }
      }

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--on-surface-variant);">Attendance Records</span>
          <strong style="color:var(--on-surface);">${attSnap.docs.length}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--on-surface-variant);">CGPA</span>
          <strong style="color:var(--primary);">${cgpaDisplay}</strong> <span style="font-size:11px;opacity:0.7">(${totalGpaSubjects} subjects)</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--on-surface-variant);">Generated Timetables</span>
          <strong style="color:var(--on-surface);">${ttSnap.docs.length}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--on-surface-variant);">Q&A Posts</span>
          <strong style="color:var(--on-surface);">${postsCount}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--on-surface-variant);">Scheduled Exams</span>
          <strong style="color:var(--on-surface);">${examCount}</strong>
        </div>
      `;
    } catch (err) {
      container.innerHTML = '<div style="text-align:center;color:#ef4444;">Failed to load activity.</div>';
    }
  };

  main.querySelector('#activity-close-btn').addEventListener('click', () => {
    activityModal.style.display = 'none';
  });

  activityModal.addEventListener('click', (e) => {
    if (e.target === activityModal) { activityModal.style.display = 'none'; }
  });

  window.viewStudentExams = function(regNum) {
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
