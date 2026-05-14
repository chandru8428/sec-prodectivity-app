/**
 * Tool 2: Timetable Maker — Constraint-Based Schedule Generator
 */
import { generateTimetable } from '../utils/timetable-algo.js';
import { showToast } from '../components/toast.js';

export default async function renderTimetableMaker(container) {
  let subjects = [
    { name: 'Mathematics IV', hoursPerWeek: 5, teacher: 'Dr. Ramesh' },
    { name: 'Operating Systems', hoursPerWeek: 4, teacher: 'Prof. Karthik' },
    { name: 'Computer Networks', hoursPerWeek: 4, teacher: 'Dr. Priya' },
  ];
  let blockedSlots = [];
  let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let periodsPerDay = 7;
  let generatedGrid = null;
  const subjectColors = {};

  function getColor(name) {
    if (!subjectColors[name]) {
      const idx = Object.keys(subjectColors).length % 8;
      subjectColors[name] = `subject-color-${idx + 1}`;
    }
    return subjectColors[name];
  }

  function render() {
    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>Timetable Maker</h1>
          <p class="subtitle">Auto-generate conflict-free class schedules</p>
        </div>

        <div class="maker-config">
          <!-- Subjects -->
          <div class="glass-card-static">
            <h3 class="section-title" style="margin-bottom:var(--space-md);">Subjects</h3>
            <div id="subjects-list">
              ${subjects.map((s, i) => `
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                  <input type="text" value="${s.name}" placeholder="Subject" data-idx="${i}" data-field="name" class="subject-input" style="flex:2;" />
                  <input type="number" value="${s.hoursPerWeek}" placeholder="Hrs/wk" data-idx="${i}" data-field="hoursPerWeek" class="subject-input" style="width:70px;" min="1" max="10" />
                  <input type="text" value="${s.teacher}" placeholder="Teacher" data-idx="${i}" data-field="teacher" class="subject-input" style="flex:1;" />
                  <button class="btn-icon remove-subject" data-idx="${i}" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-secondary btn-sm" id="add-subject-btn" style="margin-top:8px;">+ Add Subject</button>
          </div>

          <!-- Config -->
          <div class="glass-card-static">
            <h3 class="section-title" style="margin-bottom:var(--space-md);">Configuration</h3>
            <div class="form-group" style="margin-bottom:16px;">
              <label>Avoid Time Slots</label>
              <div class="tags-container" id="blocked-tags">
                ${blockedSlots.map((b, i) => `<span class="tag-item">${b.day} P${b.period}<span class="tag-remove-blocked" data-idx="${i}">×</span></span>`).join('')}
              </div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <select id="avoid-day-select" style="padding:6px; flex:1; background:var(--surface-container); border:1px solid rgba(73,72,71,0.2); border-radius:var(--radius-sm); color:var(--on-surface);">
                  ${days.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
                <select id="avoid-period-select" style="padding:6px; width:70px; background:var(--surface-container); border:1px solid rgba(73,72,71,0.2); border-radius:var(--radius-sm); color:var(--on-surface);">
                  ${Array.from({length: periodsPerDay}, (_, i) => `<option value="${i+1}">P${i+1}</option>`).join('')}
                </select>
                <button class="btn btn-sm btn-secondary" id="add-blocked-btn">Add</button>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label>Periods Per Day</label>
              <input type="number" id="periods-input" value="${periodsPerDay}" min="4" max="10" style="width:100px;" />
            </div>
            <div class="form-group">
              <label>Working Days</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => `
                  <button class="chip ${days.includes(d) ? 'active' : ''}" data-day="${d}">${d.slice(0,3)}</button>
                `).join('')}
              </div>
            </div>
            
            <h3 class="section-title" style="margin-top: var(--space-xl); margin-bottom:var(--space-md);">Quick Import Subjects</h3>
            <textarea id="paste-input" style="width:100%; height:80px; margin-bottom:8px; padding:12px; background:var(--surface-container); color:var(--on-surface); border:1px solid rgba(73,72,71,0.2); border-radius: var(--radius-md); font-family:inherit; font-size:var(--text-body-sm);" placeholder="Paste classes (Format: SubjectName - Hours - Teacher) per line."></textarea>
            <button class="btn btn-secondary btn-sm" id="parse-text-btn" style="width:100%;">Extract Subjects</button>
          </div>
        </div>

        <div style="text-align:center; margin-bottom:var(--space-xl);">
          <button class="btn btn-primary btn-lg" id="generate-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Generate Timetable
          </button>
        </div>

        ${generatedGrid ? renderGrid() : `
          <div class="empty-state">
            <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg></div>
            <h3>No Timetable Generated Yet</h3>
            <p>Add your subjects, rooms, and constraints above then click "Generate Timetable"</p>
          </div>
        `}
      </div>
    `;

    setupEvents();
  }

  function renderGrid() {
    return `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Generated Timetable</h2>
          <div class="export-actions">
            <button class="btn btn-secondary btn-sm" id="export-img-btn">📸 Save as Image</button>
            <button class="btn btn-secondary btn-sm" id="print-btn">🖨️ Print</button>
          </div>
        </div>
        <div class="timetable-grid glass-card-static" id="timetable-output" style="padding:0; overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                ${days.map(d => `<th>${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: periodsPerDay }, (_, p) => `
                <tr>
                  <td class="period-label">P${p + 1}</td>
                  ${days.map(day => {
                    const cell = generatedGrid[day]?.[p + 1];
                    if (cell) {
                      return `<td class="filled ${getColor(cell.name)}">${cell.name}<br/><small style="color:var(--outline);font-size:10px;">${cell.teacher}</small></td>`;
                    }
                    return `<td>—</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function setupEvents() {
    // Subject input changes
    container.querySelectorAll('.subject-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        if (field === 'hoursPerWeek') {
          subjects[idx][field] = parseInt(e.target.value) || 4;
        } else {
          subjects[idx][field] = e.target.value;
        }
      });
    });

    // Remove subject
    container.querySelectorAll('.remove-subject').forEach(btn => {
      btn.addEventListener('click', () => {
        subjects.splice(parseInt(btn.dataset.idx), 1);
        render();
      });
    });

    // Add subject
    document.getElementById('add-subject-btn')?.addEventListener('click', () => {
      subjects.push({ name: '', hoursPerWeek: 4, teacher: '' });
      render();
    });

    // Add blocked slot
    document.getElementById('add-blocked-btn')?.addEventListener('click', () => {
      const day = document.getElementById('avoid-day-select')?.value;
      const period = parseInt(document.getElementById('avoid-period-select')?.value);
      if (day && period && !blockedSlots.find(b => b.day === day && b.period === period)) {
        blockedSlots.push({ day, period });
        render();
      }
    });

    // Remove blocked slot
    container.querySelectorAll('.tag-remove-blocked').forEach(btn => {
      btn.addEventListener('click', () => {
        blockedSlots.splice(parseInt(btn.dataset.idx), 1);
        render();
      });
    });

    // Parse Text Input
    document.getElementById('parse-text-btn')?.addEventListener('click', () => {
      const text = document.getElementById('paste-input')?.value || "";
      const lines = text.split('\n');
      let count = 0;
      lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.split('-').map(p => p.trim());
        if (parts.length >= 1) {
          const name = parts[0];
          const hours = parseInt(parts[1]) || 4;
          const teacher = parts[2] || '';
          subjects.push({ name, hoursPerWeek: hours, teacher });
          count++;
        }
      });
      if (count > 0) {
        showToast(`Successfully imported ${count} subjects`, 'success');
        render();
      } else {
        showToast('No valid subjects parsed from text. Format: Subject Name - Hours - Teacher', 'warning');
      }
    });

    // Day chips
    container.querySelectorAll('.chip[data-day]').forEach(chip => {
      chip.addEventListener('click', () => {
        const day = chip.dataset.day;
        if (days.includes(day)) {
          days = days.filter(d => d !== day);
        } else {
          days.push(day);
          days.sort((a, b) => ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(a) - ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(b));
        }
        render();
      });
    });

    // Periods
    document.getElementById('periods-input')?.addEventListener('change', (e) => {
      periodsPerDay = parseInt(e.target.value) || 7;
    });

    // Generate
    document.getElementById('generate-btn')?.addEventListener('click', () => {
      const validSubjects = subjects.filter(s => s.name.trim());
      if (validSubjects.length === 0) {
        showToast('Please add at least one subject', 'warning');
        return;
      }
      generatedGrid = generateTimetable({
        subjects: validSubjects,
        days,
        periodsPerDay,
        blockedSlots,
        teacherAvailability: {},
      });
      if (generatedGrid) {
        showToast('Timetable generated successfully!', 'success');
      } else {
        showToast('Could not generate conflict-free timetable. Try adjusting constraints.', 'error');
      }
      render();
    });

    // Print
    document.getElementById('print-btn')?.addEventListener('click', () => {
      window.print();
    });
  }

  render();
}
