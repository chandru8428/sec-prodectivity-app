import { createLayout } from '../../components/sidebar.js';
import { showToast } from '../../main.js';

const STORAGE_KEY = 'edusync-attendance-calculator';
const DEFAULTS = {
  attendedClasses: '35',
  totalClasses: '40',
  requiredPercentage: '85',
};

export function render(root) {
  const layout = createLayout('Attendance Calculator', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');
  const saved = loadSavedState();

  main.innerHTML = `
    <div class="page-header">
      <p class="text-muted text-body-sm">Track your 85% mandate — results update live as you type</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns:minmax(0, 1.15fr) minmax(320px, 0.85fr);align-items:start">
      <div class="flex flex-col gap-6">
        <div class="glass-card">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 class="text-title">Attendance Inputs</h2>
              <p class="text-muted text-body-sm" style="margin-top:6px">Results update as you type, and your last values are saved locally in this browser.</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="reset-attendance">Reset</button>
          </div>

          <form id="attendance-form" class="grid gap-4" style="grid-template-columns:repeat(3,minmax(0,1fr));align-items:end">
            <div class="form-group">
              <label class="form-label">Attended Classes</label>
              <input class="form-input" id="attended-classes" type="number" min="0" step="1" value="${saved.attendedClasses}" />
            </div>
            <div class="form-group">
              <label class="form-label">Total Classes</label>
              <input class="form-input" id="total-classes" type="number" min="1" step="1" value="${saved.totalClasses}" />
            </div>
            <div class="form-group">
              <label class="form-label">Required Percentage</label>
              <input class="form-input" id="required-percentage" type="number" min="1" max="100" step="0.01" value="${saved.requiredPercentage}" />
            </div>
          </form>

          <div id="attendance-validation" class="alert alert-danger hidden mt-4">
            <span>⚠️</span>
            <span id="attendance-validation-text"></span>
          </div>

          <div class="grid grid-3 gap-4 mt-6">
            <div class="stat-card">
              <div class="stat-label">Current Attendance</div>
              <div class="stat-value" id="current-percentage">—</div>
              <div class="stat-change" id="current-status">Waiting for input</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Safe Bunks</div>
              <div class="stat-value" id="safe-bunks">—</div>
              <div class="stat-change" id="safe-bunks-note">Calculated only when you are above target</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Need To Attend</div>
              <div class="stat-value" id="required-classes">—</div>
              <div class="stat-change" id="required-classes-note">Calculated only when you are below target</div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h2 class="text-title mb-4">Result Breakdown</h2>
          <div id="attendance-result-panel" class="flex flex-col gap-4"></div>
        </div>
      </div>

      <div class="flex flex-col gap-4" style="position:sticky;top:80px">
        <div class="glass-card" style="text-align:center">
          <div class="text-label-sm text-muted mb-4">ATTENDANCE HEALTH</div>
          <div class="circular-gauge" style="margin:0 auto var(--space-4)">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--bg-secondary)" stroke-width="8"></circle>
              <circle cx="80" cy="80" r="68" fill="none" stroke="url(#attendanceGaugeGrad)" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 68}" stroke-dashoffset="${2 * Math.PI * 68}" id="attendance-gauge"></circle>
              <defs>
                <linearGradient id="attendanceGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#4F46E5"></stop>
                  <stop offset="100%" stop-color="#7C3AED"></stop>
                </linearGradient>
              </defs>
            </svg>
            <div class="gauge-value" id="attendance-gauge-value" style="color:var(--text-primary)">—</div>
          </div>
          <div class="text-body-sm text-muted" id="attendance-gauge-caption">Waiting for valid input</div>
        </div>

        <div class="glass-card">
          <h3 class="text-title mb-4">How It Works</h3>
          <div class="flex flex-col gap-3 text-body-sm text-muted" style="line-height:1.7">
            <div>1. Current attendance is calculated as <strong style="color:var(--color-on-surface)">attended / total × 100</strong>.</div>
            <div>2. If your current percentage is above the target, the calculator simulates future bunks one by one and finds the maximum safe number.</div>
            <div>3. If your current percentage is below the target, it simulates future attended classes until you cross the threshold.</div>
            <div>4. Everything runs fully in the browser with no backend dependency.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const inputs = {
    attended: main.querySelector('#attended-classes'),
    total: main.querySelector('#total-classes'),
    required: main.querySelector('#required-percentage'),
  };

  const recalculate = () => {
    const values = {
      attendedClasses: inputs.attended.value,
      totalClasses: inputs.total.value,
      requiredPercentage: inputs.required.value,
    };

    persistState(values);
    renderComputation(main, values);
  };

  ['input', 'change'].forEach((eventName) => {
    inputs.attended.addEventListener(eventName, recalculate);
    inputs.total.addEventListener(eventName, recalculate);
    inputs.required.addEventListener(eventName, recalculate);
  });

  main.querySelector('#attendance-form').addEventListener('submit', (e) => {
    e.preventDefault();
    recalculate();
  });

  main.querySelector('#reset-attendance').addEventListener('click', () => {
    inputs.attended.value = DEFAULTS.attendedClasses;
    inputs.total.value = DEFAULTS.totalClasses;
    inputs.required.value = DEFAULTS.requiredPercentage;
    persistState(DEFAULTS);
    recalculate();
    showToast('Attendance calculator reset', 'success');
  });

  recalculate();
}

function renderComputation(main, rawValues) {
  const validation = validateInputs(rawValues);
  const validationBox = main.querySelector('#attendance-validation');
  const validationText = main.querySelector('#attendance-validation-text');

  if (!validation.valid) {
    validationBox.classList.remove('hidden');
    validationText.textContent = validation.message;
    renderInvalidState(main);
    return;
  }

  validationBox.classList.add('hidden');

  const { attendedClasses, totalClasses, requiredPercentage } = validation.values;
  const currentPercentage = calculatePercentage(attendedClasses, totalClasses);
  const meetsRequirement = currentPercentage >= requiredPercentage;
  const safeBunks = meetsRequirement ? calculateBunks(attendedClasses, totalClasses, requiredPercentage) : 0;
  const requiredClasses = meetsRequirement ? 0 : calculateRequiredClasses(attendedClasses, totalClasses, requiredPercentage);

  updateSummaryCards(main, {
    currentPercentage,
    requiredPercentage,
    meetsRequirement,
    safeBunks,
    requiredClasses,
  });

  updateGauge(main, currentPercentage, requiredPercentage, meetsRequirement);
  renderResultPanel(main, {
    attendedClasses,
    totalClasses,
    requiredPercentage,
    currentPercentage,
    meetsRequirement,
    safeBunks,
    requiredClasses,
  });
}

function validateInputs(rawValues) {
  const attendedClasses = Number(rawValues.attendedClasses);
  const totalClasses = Number(rawValues.totalClasses);
  const requiredPercentage = Number(rawValues.requiredPercentage);

  if (![attendedClasses, totalClasses, requiredPercentage].every(Number.isFinite)) {
    return { valid: false, message: 'Please enter numeric values in all three fields.' };
  }

  if (attendedClasses < 0 || totalClasses < 0 || requiredPercentage < 0) {
    return { valid: false, message: 'Inputs must be non-negative values.' };
  }

  if (totalClasses <= 0) {
    return { valid: false, message: 'Total classes must be greater than 0.' };
  }

  if (attendedClasses > totalClasses) {
    return { valid: false, message: 'Attended classes cannot be greater than total classes.' };
  }

  if (requiredPercentage <= 0 || requiredPercentage > 100) {
    return { valid: false, message: 'Required percentage must be between 0 and 100.' };
  }

  return {
    valid: true,
    values: { attendedClasses, totalClasses, requiredPercentage },
  };
}

function calculatePercentage(attendedClasses, totalClasses) {
  return Number(((attendedClasses / totalClasses) * 100).toFixed(2));
}

function calculateBunks(attendedClasses, totalClasses, requiredPercentage) {
  let x = 0;
  while (calculatePercentage(attendedClasses, totalClasses + x) >= requiredPercentage) {
    x += 1;
  }
  return Math.max(0, x - 1);
}

function calculateRequiredClasses(attendedClasses, totalClasses, requiredPercentage) {
  let y = 0;
  while (calculatePercentage(attendedClasses + y, totalClasses + y) < requiredPercentage) {
    y += 1;
  }
  return y;
}

function updateSummaryCards(main, state) {
  const {
    currentPercentage,
    requiredPercentage,
    meetsRequirement,
    safeBunks,
    requiredClasses,
  } = state;

  main.querySelector('#current-percentage').textContent = `${currentPercentage.toFixed(2)}%`;
  main.querySelector('#current-status').textContent = meetsRequirement
    ? `Above the ${requiredPercentage}% target`
    : `Below the ${requiredPercentage}% target`;
  main.querySelector('#current-status').className = `stat-change ${meetsRequirement ? 'text-success' : 'text-danger'}`;

  main.querySelector('#safe-bunks').textContent = meetsRequirement ? String(safeBunks) : '0';
  main.querySelector('#safe-bunks-note').textContent = meetsRequirement
    ? safeBunks === 0 ? 'You are exactly at the safe limit' : 'Maximum classes you can miss safely'
    : 'Not available until you reach the target';
  main.querySelector('#safe-bunks-note').className = `stat-change ${meetsRequirement ? 'text-warning' : 'text-muted'}`;

  main.querySelector('#required-classes').textContent = meetsRequirement ? '0' : String(requiredClasses);
  main.querySelector('#required-classes-note').textContent = meetsRequirement
    ? 'You already satisfy the target'
    : 'Future classes you must attend continuously';
  main.querySelector('#required-classes-note').className = `stat-change ${meetsRequirement ? 'text-success' : 'text-danger'}`;
}

function updateGauge(main, currentPercentage, requiredPercentage, meetsRequirement) {
  const gauge = main.querySelector('#attendance-gauge');
  const gaugeValue = main.querySelector('#attendance-gauge-value');
  const gaugeCaption = main.querySelector('#attendance-gauge-caption');
  const circumference = 2 * Math.PI * 68;
  const normalizedPercentage = Math.min(100, Math.max(0, currentPercentage));

  gauge.style.strokeDashoffset = circumference - (normalizedPercentage / 100) * circumference;
  gauge.style.stroke = meetsRequirement ? '#4ade80' : currentPercentage >= requiredPercentage - 10 ? '#fb923c' : '#f87171';
  gaugeValue.textContent = `${currentPercentage.toFixed(2)}%`;
  gaugeCaption.textContent = meetsRequirement
    ? `You are safe above the ${requiredPercentage}% requirement`
    : `You must improve to reach ${requiredPercentage}%`;
  gaugeCaption.style.color = meetsRequirement ? 'var(--color-success)' : 'var(--color-warning)';
}

function renderResultPanel(main, state) {
  const {
    attendedClasses,
    totalClasses,
    requiredPercentage,
    currentPercentage,
    meetsRequirement,
    safeBunks,
    requiredClasses,
  } = state;

  const panel = main.querySelector('#attendance-result-panel');
  panel.innerHTML = `
    <div class="alert ${meetsRequirement ? 'alert-success' : 'alert-warning'}">
      <span>${meetsRequirement ? '✅' : '⚠️'}</span>
      <div>
        <div style="font-weight:700;margin-bottom:4px">${meetsRequirement ? 'Requirement satisfied' : 'Requirement not yet satisfied'}</div>
        <div>Your current attendance is <strong>${currentPercentage.toFixed(2)}%</strong> from <strong>${attendedClasses}</strong> attended classes out of <strong>${totalClasses}</strong> total classes.</div>
      </div>
    </div>

    <div class="grid grid-2 gap-4">
      <div class="glass-surface" style="padding:var(--space-5)">
        <div class="text-label-sm text-muted mb-2">Attendance Percentage Formula</div>
        <div style="font-family:monospace;font-size:14px;color:var(--color-on-surface)">
          (${attendedClasses} / ${totalClasses}) × 100 = ${currentPercentage.toFixed(2)}%
        </div>
      </div>
      <div class="glass-surface" style="padding:var(--space-5)">
        <div class="text-label-sm text-muted mb-2">Target Threshold</div>
        <div style="font-family:monospace;font-size:14px;color:var(--color-on-surface)">
          Required Percentage = ${requiredPercentage}%
        </div>
      </div>
    </div>

    <div class="glass-surface" style="padding:var(--space-5)">
      <div class="text-label-sm text-muted mb-2">Decision Branch</div>
      <div style="font-size:14px;color:var(--color-on-surface);line-height:1.8">
        ${meetsRequirement
          ? `Current attendance is above or equal to the target, so the calculator simulates future bunks and finds the maximum safe value. Result: <strong>${safeBunks}</strong> safe bunks.`
          : `Current attendance is below the target, so the calculator simulates future attended classes until the threshold is reached. Result: <strong>${requiredClasses}</strong> classes must be attended continuously.`}
      </div>
    </div>
  `;
}

function renderInvalidState(main) {
  main.querySelector('#current-percentage').textContent = '—';
  main.querySelector('#current-status').textContent = 'Fix the inputs to continue';
  main.querySelector('#current-status').className = 'stat-change text-danger';
  main.querySelector('#safe-bunks').textContent = '—';
  main.querySelector('#safe-bunks-note').textContent = 'Waiting for valid input';
  main.querySelector('#safe-bunks-note').className = 'stat-change text-muted';
  main.querySelector('#required-classes').textContent = '—';
  main.querySelector('#required-classes-note').textContent = 'Waiting for valid input';
  main.querySelector('#required-classes-note').className = 'stat-change text-muted';

  const gauge = main.querySelector('#attendance-gauge');
  const gaugeValue = main.querySelector('#attendance-gauge-value');
  const gaugeCaption = main.querySelector('#attendance-gauge-caption');
  const circumference = 2 * Math.PI * 68;
  gauge.style.strokeDashoffset = circumference;
  gauge.style.stroke = 'var(--text-muted)';
  gaugeValue.textContent = '—';
  gaugeCaption.textContent = 'Waiting for valid input';
  gaugeCaption.style.color = 'var(--color-on-surface-variant)';

  main.querySelector('#attendance-result-panel').innerHTML = `
    <div class="glass-surface" style="padding:var(--space-5)">
      <div class="text-label-sm text-muted mb-2">Input Rules</div>
      <div class="text-body-sm text-muted" style="line-height:1.8">
        Attended classes must be non-negative, total classes must be greater than 0, attended classes cannot exceed total classes, and the required percentage must stay between 0 and 100.
      </div>
    </div>
  `;
}

function persistState(values) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw);
    return {
      attendedClasses: saved.attendedClasses ?? DEFAULTS.attendedClasses,
      totalClasses: saved.totalClasses ?? DEFAULTS.totalClasses,
      requiredPercentage: saved.requiredPercentage ?? DEFAULTS.requiredPercentage,
    };
  } catch {
    return DEFAULTS;
  }
}
