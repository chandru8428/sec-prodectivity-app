/**
 * Tool 1: Rebuilt Exam Timetable Hub
 * Integrated with Firestore for master schedule management.
 */
import { daysUntil, getCountdownBadge, formatDate, debounce } from '../utils/helpers.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { 
  getExams, 
  getFilteredExamsForStudent, 
  uploadExamsBatch, 
  clearAllExams, 
  deleteExam, 
  updateExam 
} from '../services/firestore-service.js';
import * as XLSX from 'xlsx';

export default async function renderExamTimetable(container) {
  const user = window.__currentUser;
  const isAdmin = user?.role === 'admin' || user?.regNo === '212224220017';
  const userRegNo = (user?.regNo || user?.uid || '').toLowerCase();
  
  let allExams = [];
  let isLoading = true;

  async function loadData() {
    isLoading = true;
    render();
    try {
      if (isAdmin) {
        allExams = await getExams();
      } else {
        allExams = await getFilteredExamsForStudent(userRegNo);
      }
    } catch (e) {
      console.error('Error loading exams:', e);
      showToast('Error loading schedule', 'error');
    } finally {
      isLoading = false;
      render();
    }
  }

  let searchQuery = '';

  function render() {
    if (isLoading) {
      container.innerHTML = `
        <div class="loader-container" style="display:flex; justify-content:center; align-items:center; height:300px;">
          <div class="loader"></div>
        </div>
      `;
      return;
    }

    const filtered = allExams.filter(e => 
      !searchQuery || 
      e.subjectName?.toLowerCase().includes(searchQuery) || 
      e.subjectCode?.toLowerCase().includes(searchQuery) ||
      e.targetStudent?.toLowerCase().includes(searchQuery)
    );

    const now = new Date();
    const upcoming = filtered.filter(e => new Date(e.date) >= now).sort((a,b) => new Date(a.date) - new Date(b.date));
    const finished = filtered.filter(e => new Date(e.date) < now).sort((a,b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>Exam Timetable Hub</h1>
          <p class="subtitle">${isAdmin ? 'Master Schedule Management' : `Schedule for ${userRegNo.toUpperCase()}`}</p>
        </div>

        <div class="timetable-controls">
          <div class="search-input" style="flex:1; max-width:400px;">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="exam-search" placeholder="Search subject or RegNo..." value="${searchQuery}" />
          </div>

          ${isAdmin ? `
            <button class="btn btn-secondary" id="clear-all-btn" style="border-color: var(--error); color: var(--error);">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Clear All
            </button>
            <button class="btn btn-ghost" id="upload-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Upload Source
            </button>
            <button class="btn btn-primary" id="add-exam-btn">
              + Add Exam
            </button>
          ` : `
            <button class="btn btn-secondary" id="add-calendar-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="10" x2="14" y1="16" y2="16"/></svg>
              Add to Calendar
            </button>
          `}
        </div>

        <div class="timetable-table-wrap glass-card-static" style="padding:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Time & Venue</th>
                ${isAdmin ? '<th>Target Student</th>' : ''}
                <th>Status</th>
                ${isAdmin ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${upcoming.length > 0 ? `<tr><td colspan="${isAdmin ? 6 : 4}" class="row-separator">Upcoming Exams</td></tr>` : ''}
              ${upcoming.map(exam => renderRow(exam)).join('')}
              
              ${finished.length > 0 ? `<tr><td colspan="${isAdmin ? 6 : 4}" class="row-separator">Finished Exams</td></tr>` : ''}
              ${finished.map(exam => renderRow(exam)).join('')}

              ${filtered.length === 0 ? `<tr><td colspan="${isAdmin ? 6 : 4}" style="text-align:center; padding:60px; color:var(--outline);">No examinations found for this query.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    setupEvents();
  }

  function renderRow(exam) {
    const days = daysUntil(exam.date);
    const badge = getCountdownBadge(days);
    const isFinished = days < 0;

    return `
      <tr class="${isFinished ? 'exam-finished' : ''}">
        <td>
          <div style="font-weight:600; color:var(--on-surface); font-size:1.1rem;">${formatDate(exam.date)}</div>
          <div style="font-size:0.75rem; color:var(--outline);">${new Date(exam.date).toLocaleDateString('en', { weekday: 'long' })}</div>
        </td>
        <td>
          <div style="color:var(--on-surface); font-weight:500;">${exam.subjectName}</div>
          <div style="font-size:0.8rem;"><span class="badge badge-neutral">${exam.subjectCode}</span></div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${exam.time}
          </div>
          <div style="font-size:0.8rem; color:var(--outline); margin-top:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${exam.venue}
          </div>
        </td>
        ${isAdmin ? `<td><span style="font-family:monospace; font-size:0.85rem;">${exam.targetStudent?.toUpperCase() || 'ALL'}</span></td>` : ''}
        <td>
          <span class="badge ${isFinished ? 'badge-neutral' : badge.class}">${isFinished ? 'Finished' : badge.text}</span>
        </td>
        ${isAdmin ? `
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn-icon edit-exam" data-id="${exam.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
              <button class="btn-icon delete-exam" data-id="${exam.id}" style="color:var(--error);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
            </div>
          </td>
        ` : ''}
      </tr>
    `;
  }

  function setupEvents() {
    document.getElementById('exam-search')?.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    }, 200));

    if (isAdmin) {
      document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
        if (confirm('CAUTION: This will delete ALL exams from the database. Proced?')) {
          await clearAllExams();
          showToast('All exams cleared', 'success');
          loadData();
        }
      });

      document.getElementById('upload-btn')?.addEventListener('click', openUploadModal);
      document.getElementById('add-exam-btn')?.addEventListener('click', () => openExamModal(null));

      document.querySelectorAll('.delete-exam').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this exam entry?')) {
            await deleteExam(btn.dataset.id);
            loadData();
          }
        });
      });

      document.querySelectorAll('.edit-exam').forEach(btn => {
        btn.addEventListener('click', () => {
          const exam = allExams.find(e => e.id === btn.dataset.id);
          openExamModal(exam);
        });
      });
    } else {
      document.getElementById('add-calendar-btn')?.addEventListener('click', () => {
        // ... calendar logic ...
      });
    }
  }

  function openExamModal(exam) {
    showModal({
      title: exam ? 'Edit Exam' : 'Add Manual Exam',
      content: `
        <div class="form-group"><label>Subject Code</label><input type="text" id="m-code" value="${exam?.subjectCode || ''}"></div>
        <div class="form-group"><label>Subject Name</label><input type="text" id="m-name" value="${exam?.subjectName || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label>Date</label><input type="date" id="m-date" value="${exam?.date || ''}"></div>
          <div class="form-group"><label>Time</label><input type="text" id="m-time" value="${exam?.time || '10:00 AM'}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Venue</label><input type="text" id="m-venue" value="${exam?.venue || ''}"></div>
          <div class="form-group"><label>Target Student (RegNo or 'all')</label><input type="text" id="m-target" value="${exam?.targetStudent || 'all'}"></div>
        </div>
      `,
      footer: `<button class="btn btn-primary" id="save-modal-btn">Save Entry</button>`,
    });

    document.getElementById('save-modal-btn').addEventListener('click', async () => {
      const data = {
        subjectCode: document.getElementById('m-code').value,
        subjectName: document.getElementById('m-name').value,
        date: document.getElementById('m-date').value,
        time: document.getElementById('m-time').value,
        venue: document.getElementById('m-venue').value,
        targetStudent: document.getElementById('m-target').value,
      };
      if (exam) {
        await updateExam(exam.id, data);
      } else {
        await uploadExamsBatch([data]);
      }
      document.querySelector('.modal-backdrop').remove();
      loadData();
    });
  }

  function openUploadModal() {
    showModal({
      title: 'Import Master Schedule',
      content: `
        <div class="upload-zone" id="drop-zone" style="border:2px dashed var(--primary); padding:40px; border-radius:12px; text-align:center; cursor:pointer;">
          <input type="file" id="file-input" accept=".xlsx, .csv" style="display:none;">
          <div style="font-size:2rem; margin-bottom:12px;">📄</div>
          <p>Drop your Source Excel here or click to browse</p>
          <p style="font-size:0.75rem; color:var(--outline); margin-top:12px;">Auto-detects: Reg No, Subject, Date, Time, Venue</p>
        </div>
      `
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFile(e.target.files[0]);
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet);
      
      if (rawJson.length === 0) {
        showToast('File is empty', 'error');
        return;
      }

      // Robust Column Mapping
      const keys = Object.keys(rawJson[0]);
      const findKey = (patterns) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));

      const mapping = {
        regNo: findKey(['reg', 'roll', 'student', 'id']),
        subjectCode: findKey(['code', 'subject code', 'sub code', 'r2019', 'r2020', 'r2021', 'r2022', 'r2023', 'r2024', 'r2025', 'regulation', 'reg']),
        subjectName: findKey(['subject', 'sub name', 'course']),
        date: findKey(['date']),
        time: findKey(['time', 'slot']),
        venue: findKey(['venue', 'hall', 'room', 'block'])
      };

      const mappedExams = rawJson.map(row => {
        let subjectCode = String(row[mapping.subjectCode] || '').trim();
        let subjectName = String(row[mapping.subjectName] || '').trim();
        
        // Handle regulation codes (R2019, R2024, etc.) as subject codes
        // If subjectName is empty but we have a regulation code as subjectCode
        if (!subjectName && (subjectCode.match(/^R20\d{2}$/i) || subjectCode.match(/^R\d{4}$/i))) {
          subjectName = subjectCode; // Use regulation code as subject name too
        }
        
        return {
          targetStudent: String(row[mapping.regNo] || 'all').trim(),
          subjectCode: subjectCode,
          subjectName: subjectName,
          date: formatDateForDB(row[mapping.date]),
          time: String(row[mapping.time] || '').trim(),
          venue: String(row[mapping.venue] || '').trim()
        };
      }).filter(e => e.subjectName || e.subjectCode);

      try {
        await uploadExamsBatch(mappedExams);
        showToast(`Imported ${mappedExams.length} records`, 'success');
        document.querySelector('.modal-backdrop').remove();
        loadData();
      } catch (err) {
        showToast('Upload failed', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function formatDateForDB(val) {
    if (!val) return '';
    if (typeof val === 'number') {
      // Handle Excel numeric dates
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
    // Try simple parsing
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}
    return String(val);
  }

  loadData();
}
