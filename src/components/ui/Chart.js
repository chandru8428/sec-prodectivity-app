/**
 * Chart.js Wrapper Utilities
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Default dark theme options
const darkDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#adaaaa',
        font: { family: 'Inter', size: 12 },
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#262626',
      titleColor: '#ffffff',
      bodyColor: '#adaaaa',
      borderColor: 'rgba(73, 72, 71, 0.15)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
    },
  },
  scales: {
    x: {
      ticks: { color: '#adaaaa', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(73, 72, 71, 0.1)' },
      border: { color: 'rgba(73, 72, 71, 0.15)' },
    },
    y: {
      ticks: { color: '#adaaaa', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(73, 72, 71, 0.1)' },
      border: { color: 'rgba(73, 72, 71, 0.15)' },
    },
  },
};

export function createChart(canvas, type, data, customOptions = {}) {
  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type,
    data,
    options: deepMerge(darkDefaults, customOptions),
  });
}

export function createGradient(ctx, color1, color2, height = 300) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

export { Chart };
