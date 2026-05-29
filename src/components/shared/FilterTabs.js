/**
 * FilterTabs — Reusable horizontal scrollable tab bar with pill-style tabs.
 *
 * @param {Object}    opts
 * @param {Array}     opts.tabs     - [{ id, label, count? }]
 * @param {string}    opts.activeId - Currently active tab id
 * @param {string}    [opts.containerId] - Optional container id for JS hookup
 * @returns {string}  HTML string
 */
export function FilterTabs({ tabs = [], activeId = '', containerId = 'filter-tabs' } = {}) {
  return `
    <div class="filter-tabs" id="${containerId}" role="tablist">
      ${tabs.map(tab => `
        <button
          class="filter-tab ${tab.id === activeId ? 'active' : ''}"
          data-tab-id="${tab.id}"
          role="tab"
          aria-selected="${tab.id === activeId}"
        >
          ${tab.label}${tab.count != null ? ` <span class="filter-tab-count">${tab.count}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Attach click handlers to a FilterTabs container.
 *
 * @param {HTMLElement} container  - The parent element containing the filter-tabs
 * @param {string}     containerId - The id used in FilterTabs()
 * @param {Function}   onTabClick  - Callback receiving the tab id string
 */
export function attachFilterTabHandlers(container, containerId, onTabClick) {
  const tabBar = container.querySelector(`#${containerId}`);
  if (!tabBar) return;

  tabBar.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active states
      tabBar.querySelectorAll('.filter-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      onTabClick(btn.dataset.tabId);
    });
  });
}
