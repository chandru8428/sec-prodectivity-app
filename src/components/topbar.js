/**
 * Top Navigation Bar Component
 */
export function renderTopbar(user) {
  const topbar = document.getElementById('topbar');
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  topbar.innerHTML = `
    <div class="topbar-inner">
      <div class="topbar-left">
        <button class="topbar-icon-btn menu-toggle" id="mobile-menu-toggle" title="Menu" style="display:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <div class="topbar-greeting">
          <span class="greeting-text">${greeting},</span>
          <span class="greeting-name">${displayName}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="topbar-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search tools, subjects..." id="global-search" />
        </div>
        <button class="topbar-icon-btn" id="notifications-btn" title="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span class="notification-dot"></span>
        </button>
        <div class="topbar-avatar" id="user-menu-toggle">
          <div class="avatar">${initials}</div>
        </div>
      </div>
    </div>
  `;

  // Search navigation
  const searchInput = document.getElementById('global-search');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.toLowerCase().trim();
      const routeMap = {
        'gpa': '/gpa-calculator', 'cgpa': '/gpa-calculator', 'grade': '/gpa-calculator',
        'timetable': '/exam-timetable', 'exam': '/exam-timetable', 'schedule': '/timetable-maker',
        'attendance': '/attendance', 'absent': '/attendance',
        'question': '/qna-board', 'q&a': '/qna-board', 'ask': '/qna-board',
        'record': '/record-book', 'pdf': '/record-book', 'lab': '/record-book', 'github': '/record-book',
      };
      for (const [key, route] of Object.entries(routeMap)) {
        if (query.includes(key)) {
          window.location.hash = `#${route}`;
          searchInput.value = '';
          return;
        }
      }
    }
  });
}
