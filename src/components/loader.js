/**
 * Loading/Skeleton Components
 */
export function renderPageLoader() {
  return '<div class="page-loader"><div class="spinner"></div></div>';
}

export function renderSkeleton(count = 3, height = '120px') {
  return Array.from({ length: count }, () =>
    `<div class="skeleton" style="height:${height}; margin-bottom: 16px;"></div>`
  ).join('');
}

export function renderCardSkeleton(count = 4) {
  return `<div class="grid grid-4">${
    Array.from({ length: count }, () =>
      `<div class="skeleton" style="height: 140px;"></div>`
    ).join('')
  }</div>`;
}
