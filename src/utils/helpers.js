/**
 * Common Helper Functions
 */

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

export function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function getCountdownBadge(daysLeft) {
  if (daysLeft < 0) return { text: 'Completed', class: 'badge-neutral' };
  if (daysLeft === 0) return { text: 'Today!', class: 'badge-danger' };
  if (daysLeft <= 3) return { text: `${daysLeft}d left`, class: 'badge-danger' };
  if (daysLeft <= 7) return { text: `${daysLeft}d left`, class: 'badge-warning' };
  return { text: `${daysLeft}d left`, class: 'badge-success' };
}

export function getAttendanceColor(percentage) {
  if (percentage >= 85) return 'success';
  if (percentage >= 75) return 'warning';
  return 'danger';
}

export function safeToSkip(attended, total, threshold = 85) {
  // How many more can they skip while staying >= threshold%
  // (attended / (total + x)) >= threshold/100
  // attended * 100 >= threshold * (total + x)
  // x <= (attended * 100 / threshold) - total
  const maxTotal = Math.floor((attended * 100) / threshold);
  const canSkip = maxTotal - total;
  return Math.max(0, canSkip);
}

export function needToAttend(attended, total, threshold = 85) {
  // How many more they need to attend to reach threshold
  // ((attended + x) / (total + x)) >= threshold/100
  // 100*(attended + x) >= threshold*(total + x)
  // x * (100 - threshold) >= threshold*total - 100*attended
  // x >= (threshold*total - 100*attended) / (100 - threshold)
  const needed = Math.ceil((threshold * total - 100 * attended) / (100 - threshold));
  return Math.max(0, needed);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
