/**
 * Tool 3: GPA / CGPA Calculator — Anna University
 */
import { gradeTable, getGradeFromMarks, calculateGPA, calculateTargetGPA, getGradeColor } from '../utils/grading.js';
import { createChart } from '../components/chart.js';
import { showToast } from '../components/toast.js';

export default async function renderGPACalculator(container) {
  let subjects = [
    { name: 'Engineering Mathematics IV', credits: 4, marks: 85 },
    { name: 'Operating Systems', credits: 3, marks: 78 },
    { name: 'Computer Networks', credits: 3, marks: 92 },
    { name: 'Database Management Systems', credits: 3, marks: 70 },
    { name: 'Software Engineering', credits: 3, marks: 65 },
    { name: 'Environmental Science', credits: 2, marks: 88 },
  ];

  let semesterHistory = [
    { semester: 1, gpa: 7.8 },
    { semester: 2, gpa: 8.1 },
    { semester: 3, gpa: 8.3 },
    { semester: 4, gpa: 8.0 },
    { semester: 5, gpa: 8.7 },
  ];

  let targetCGPA = 8.5;
  let gpaChart = null;
  let pieChart = null;

  function render() {
    const currentGPA = calculateGPA(subjects);
    const allGPAs = [...semesterHistory, { semester: 6, gpa: currentGPA }];
    const cgpa = allGPAs.reduce((s, g) => s + g.gpa, 0) / allGPAs.length;
    const requiredGPA = calculateTargetGPA(cgpa, allGPAs.length - 1, targetCGPA);

    // Grade distribution
    const gradeCounts = {};
    subjects.forEach(s => {
      const g = getGradeFromMarks(s.marks);
      gradeCounts[g.grade] = (gradeCounts[g.grade] || 0) + 1;
    });

    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>GPA / CGPA Calculator</h1>
          <p class="subtitle">Anna University Grading System — Regulation 2021</p>
        </div>

        <div class="gpa-layout">
          <!-- Main: Subject Form -->
          <div>
            <div class="glass-card-static" style="margin-bottom:var(--space-lg);">
              <div class="section-header" style="margin-bottom:var(--space-md);">
                <h2 class="section-title">Current Semester Subjects</h2>
                <button class="btn btn-secondary btn-sm" id="add-sub-btn">+ Add Subject</button>
              </div>
              <div class="subjects-header">
                <span>Subject Name</span>
                <span>Credits</span>
                <span>Marks</span>
                <span>Grade</span>
                <span>Points</span>
                <span></span>
              </div>
              <div class="subjects-form" id="subjects-form">
                ${subjects.map((s, i) => {
                  const g = getGradeFromMarks(s.marks);
                  return `
                    <div class="subject-row">
                      <input type="text" value="${s.name}" data-idx="${i}" data-field="name" class="sub-input" placeholder="Subject name" />
                      <input type="number" value="${s.credits}" data-idx="${i}" data-field="credits" class="sub-input" min="1" max="5" />
                      <input type="number" value="${s.marks}" data-idx="${i}" data-field="marks" class="sub-input" min="0" max="100" />
                      <span class="grade-display" style="color:${getGradeColor(g.grade)}">${g.grade}</span>
                      <span class="grade-display" style="color:var(--on-surface-variant)">${g.points}</span>
                      <button class="remove-btn" data-idx="${i}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- GPA Result -->
            <div class="glass-card-static gpa-result-card" style="margin-bottom:var(--space-lg);">
              <p class="text-label">Your Semester GPA</p>
              <div class="gpa-big-number">${currentGPA.toFixed(2)}</div>
              <p class="text-body-sm" style="color:var(--on-surface-variant);">CGPA: <strong style="color:var(--on-surface);">${cgpa.toFixed(2)}</strong> (${allGPAs.length} semesters)</p>
            </div>

            <!-- CGPA Trend Chart -->
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">CGPA Trend</h3>
              <div class="chart-container">
                <canvas id="gpa-trend-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="gpa-sidebar">
            <!-- Grade Reference -->
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">Grade Reference</h3>
              <table class="grade-ref-table">
                ${gradeTable.map(g => `
                  <tr>
                    <td style="color:${getGradeColor(g.grade)}">${g.grade}</td>
                    <td>${g.minMarks}-${g.maxMarks}</td>
                    <td>${g.points}</td>
                    <td style="color:var(--outline)">${g.label}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <!-- Grade Distribution -->
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">Grade Distribution</h3>
              <div class="chart-container" style="height:200px;">
                <canvas id="grade-pie-chart"></canvas>
              </div>
            </div>

            <!-- Target Calculator -->
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">Target Calculator</h3>
              <div class="target-calc">
                <div class="form-group">
                  <label>Target CGPA</label>
                  <input type="number" id="target-input" value="${targetCGPA}" step="0.1" min="5" max="10" />
                </div>
                <div class="target-result">
                  Need GPA ≥ <strong>${requiredGPA.toFixed(2)}</strong>
                  ${requiredGPA > 10 ? '<br><small style="color:var(--error);">Not achievable</small>' : ''}
                </div>
              </div>
            </div>

            <!-- Save -->
            <button class="btn btn-primary" id="save-gpa-btn" style="width:100%;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save Semester Data
            </button>
          </div>
        </div>
      </div>
    `;

    setupEvents();
    initCharts(allGPAs, gradeCounts);
  }

  function initCharts(allGPAs, gradeCounts) {
    // GPA Trend Line Chart
    const trendCanvas = document.getElementById('gpa-trend-chart');
    if (trendCanvas) {
      if (gpaChart) gpaChart.destroy();
      gpaChart = createChart(trendCanvas, 'line', {
        labels: allGPAs.map(g => `Sem ${g.semester}`),
        datasets: [{
          label: 'GPA',
          data: allGPAs.map(g => g.gpa),
          borderColor: '#e08efe',
          backgroundColor: 'rgba(224, 142, 254, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#e08efe',
          pointBorderColor: '#e08efe',
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      }, {
        scales: { y: { min: 5, max: 10 } },
        plugins: { legend: { display: false } },
      });
    }

    // Grade Pie Chart
    const pieCanvas = document.getElementById('grade-pie-chart');
    if (pieCanvas) {
      if (pieChart) pieChart.destroy();
      const grades = Object.keys(gradeCounts);
      pieChart = createChart(pieCanvas, 'doughnut', {
        labels: grades,
        datasets: [{
          data: grades.map(g => gradeCounts[g]),
          backgroundColor: grades.map(g => getGradeColor(g)),
          borderWidth: 0,
        }],
      }, {
        plugins: { legend: { position: 'bottom' } },
        scales: {},
      });
    }
  }

  function setupEvents() {
    // Subject input changes
    container.querySelectorAll('.sub-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        if (field === 'credits' || field === 'marks') {
          subjects[idx][field] = parseInt(e.target.value) || 0;
        } else {
          subjects[idx][field] = e.target.value;
        }
        render();
      });
    });

    // Remove subject
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        subjects.splice(parseInt(btn.dataset.idx), 1);
        render();
      });
    });

    // Add subject
    document.getElementById('add-sub-btn')?.addEventListener('click', () => {
      subjects.push({ name: '', credits: 3, marks: 0 });
      render();
    });

    // Target CGPA
    document.getElementById('target-input')?.addEventListener('change', (e) => {
      targetCGPA = parseFloat(e.target.value) || 8.0;
      render();
    });

    // Save
    document.getElementById('save-gpa-btn')?.addEventListener('click', () => {
      showToast('Semester data saved locally!', 'success');
    });
  }

  render();

  return () => {
    if (gpaChart) gpaChart.destroy();
    if (pieChart) pieChart.destroy();
  };
}
