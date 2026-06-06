/**
 * EmptyState — Reusable empty-state component for mobile-friendly placeholder UI.
 *
 * @param {Object}  opts
 * @param {string}  opts.icon         - Emoji or SVG string (e.g. '<i data-lucide="bar-chart-3" class="icon-inline"></i>')
 * @param {string}  opts.title        - Short label (e.g. 'No grades yet')
 * @param {string}  [opts.description]- Helper text (optional)
 * @param {string}  [opts.actionLabel]- CTA button text (optional)
 * @param {string}  [opts.actionPath] - Hash route for the CTA (optional)
 * @returns {string} HTML string
 */
export function EmptyState({ icon = '<i data-lucide="inbox" class="icon-inline"></i>', title = 'Nothing here yet', description = '', actionLabel = '', actionPath = '' } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      ${description ? `<div class="empty-state-desc">${description}</div>` : ''}
      ${actionLabel && actionPath ? `
        <a href="#${actionPath}" class="btn btn-secondary btn-sm empty-state-action">${actionLabel}</a>
      ` : ''}
    </div>
  `;
}
