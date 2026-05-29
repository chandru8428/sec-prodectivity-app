/**
 * EmptyState — Reusable empty-state component for mobile-friendly placeholder UI.
 *
 * @param {Object}  opts
 * @param {string}  opts.icon         - Emoji or SVG string (e.g. '📊')
 * @param {string}  opts.title        - Short label (e.g. 'No grades yet')
 * @param {string}  [opts.description]- Helper text (optional)
 * @param {string}  [opts.actionLabel]- CTA button text (optional)
 * @param {string}  [opts.actionPath] - Hash route for the CTA (optional)
 * @returns {string} HTML string
 */
export function EmptyState({ icon = '📭', title = 'Nothing here yet', description = '', actionLabel = '', actionPath = '' } = {}) {
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
