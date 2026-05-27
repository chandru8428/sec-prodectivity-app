/**
 * Toast Notifications Component
 */
let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-root');
    if (!container.classList.contains('toast-container')) {
      container.classList.add('toast-container');
    }
  }
  return container;
}

export function showToast(message, type = 'info', duration = 4000) {
  const root = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

  root.appendChild(toast);

  const remove = () => {
    toast.style.animation = 'slideInRight 200ms ease-out reverse';
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close').addEventListener('click', remove);
  if (duration > 0) setTimeout(remove, duration);

  return { remove };
}
