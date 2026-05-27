/**
 * Modal Component
 */
export function showModal({ title, content, footer, size = 'md', onClose }) {
  const root = document.getElementById('modal-root');
  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${sizeClass}">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="btn-icon modal-close-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  root.appendChild(backdrop);

  const closeModal = () => {
    backdrop.style.animation = 'fadeIn 150ms ease-out reverse';
    setTimeout(() => { backdrop.remove(); onClose?.(); }, 150);
  };

  backdrop.querySelector('.modal-close-btn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

  return { close: closeModal, element: backdrop };
}
