import { router } from '../router.js';
import { appState } from '../main.js';
import { signOut, auth } from '/src/firebase.js';
import { showToast } from '../main.js';

const studentNavItems = [
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>', label: 'Dashboard',       path: '/student/dashboard' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>', label: 'Exam Roadmap',  path: '/student/timetable' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>', label: 'AI Schedule Crafter', path: '/student/timetable-maker' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.25V14"/><circle cx="16" cy="16" r="6"/></svg>', label: 'GPA / CGPA',      path: '/student/gpa' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'Knowledge Exchange',       path: '/student/qa-board' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: 'Record Book Forge', path: '/student/record-book' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', label: 'Attendance',      path: '/student/attendance' },
];

const adminNavItems = [
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>', label: 'Dashboard',         path: '/admin/dashboard' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>', label: 'Upload Timetable',  path: '/admin/upload-timetable' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', label: 'Repo Mapping',      path: '/admin/repo-mapping' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>', label: 'Q&A Moderation',   path: '/admin/moderation' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>', label: 'Academic Calendar', path: '/admin/calendar' },
  { icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'All Students',      path: '/admin/students' },
];

export function renderSidebar(container) {
  const role     = appState.userRole;
  const navItems = role === 'admin' ? adminNavItems : studentNavItems;
  const current  = router.getCurrentPath();
  const user     = appState.userData;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'Primary navigation');

  sidebar.innerHTML = `
    <a class="sidebar-logo" href="#/student/dashboard" data-link>
      <div class="logo-icon">🎓</div>
      <div class="logo-text">
        <div class="app-name">EduSync</div>
        <div class="app-sub">${role === 'admin' ? 'Admin Panel' : 'Student Hub'}</div>
      </div>
    </a>

    <nav class="sidebar-nav" id="sidebar-nav">
      <span class="nav-section-label">Navigation</span>
      ${navItems.map(item => `
        <button class="nav-item ${current === item.path ? 'active' : ''}" data-path="${item.path}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user-menu">
        <div class="user-avatar">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="text-body-sm" style="font-weight:600;color:#1F1F1F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user?.name || 'User'}</div>
          <div style="font-size:11px;color:#666666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user?.registerNumber || user?.email || ''}</div>
        </div>
        <button class="btn btn-sm" id="logout-btn" title="Logout" style="background:linear-gradient(135deg, #D89B29, #A86E11);color:white;border:none;border-radius:12px;padding:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(216,155,41,0.25);cursor:pointer;transition:all 0.2s;width:38px;height:38px;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
        </button>
      </div>
    </div>
  `;

  container.appendChild(sidebar);

  // Nav item click
  sidebar.querySelectorAll('[data-path]').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(btn.dataset.path);
    });
  });

  // Logout
  sidebar.querySelector('#logout-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await signOut(auth);
      showToast('Logged out successfully', 'success');
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  });

  return sidebar;
}

export function createLayout(title, content, breadcrumb = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'app-layout';

  renderSidebar(wrapper);

  const role = appState.userRole;
  const navItems = role === 'admin' ? adminNavItems : studentNavItems;
  const user = appState.userData;
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const current = router.getCurrentPath();
  const mobileNavItems = navItems.slice(0, 4);
  const shortLabel = (label) => {
    const map = {
      Dashboard: 'Home',
      'Exam Roadmap': 'Exams',
      'AI Schedule Crafter': 'Schedule',
      'GPA / CGPA': 'GPA',
      'Knowledge Exchange': 'Q&A',
      'Record Book Forge': 'Records',
      Attendance: 'Attend',
      'Upload Timetable': 'Upload',
      'Repo Mapping': 'Repos',
      'Q&A Moderation': 'Q&A',
      'Academic Calendar': 'Calendar',
      'All Students': 'Students',
    };
    return map[label] || label.split(' ')[0];
  };

  const main = document.createElement('div');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="top-bar">
      <div class="flex items-center gap-4">
        <button class="btn btn-ghost btn-sm" id="mobile-menu-btn" type="button" aria-label="Open navigation menu" aria-controls="sidebar" aria-expanded="false" style="display:none;border-radius:12px">☰</button>
        <div>
          ${breadcrumb ? `<div class="text-label-sm text-muted" style="margin-bottom:2px;color:#666666">${breadcrumb}</div>` : ''}
          <div style="font-size:26px;font-weight:800;color:#1F1F1F;letter-spacing:-0.5px;">${title}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        ${role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
        <div class="user-avatar" style="width:40px;height:40px;border-radius:12px">${initials}</div>
      </div>
    </header>
    <main class="page-content" id="page-main">
      ${content}
    </main>
    
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav" aria-label="Quick mobile navigation">
      <div class="mobile-bottom-nav-items">
        ${mobileNavItems.map(item => `
          <a href="#${item.path}" class="mobile-bottom-nav-item ${current === item.path ? 'active' : ''}" aria-label="${item.label}">
            ${item.icon}
            <span>${shortLabel(item.label)}</span>
          </a>
        `).join('')}
        <button class="mobile-bottom-nav-item" id="mobile-more-btn" type="button" aria-label="Open full navigation menu" aria-controls="sidebar" aria-expanded="false">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
          <span>More</span>
        </button>
      </div>
    </nav>
    <div class="sidebar-backdrop" id="sidebar-backdrop" hidden></div>
  `;

  wrapper.appendChild(main);

  // Mobile menu
  const menuBtn = main.querySelector('#mobile-menu-btn');
  const moreBtn = main.querySelector('#mobile-more-btn');
  const backdrop = main.querySelector('#sidebar-backdrop');
  const sidebar = wrapper.querySelector('#sidebar');

  const setDrawerState = (open) => {
    if (!sidebar) return;
    sidebar.classList.toggle('mobile-open', open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle('active', open);
    }
    document.body.classList.toggle('nav-lock', open);
    [menuBtn, moreBtn].forEach((btn) => btn?.setAttribute('aria-expanded', String(open)));
  };

  if (sidebar) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close navigation menu');
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.addEventListener('click', () => setDrawerState(false));
    sidebar.insertBefore(closeBtn, sidebar.firstChild);
  }

  menuBtn?.addEventListener('click', () => setDrawerState(!sidebar?.classList.contains('mobile-open')));
  moreBtn?.addEventListener('click', () => setDrawerState(true));
  backdrop?.addEventListener('click', () => setDrawerState(false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setDrawerState(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setDrawerState(false);
  });

  // Close sidebar when clicking a nav link on mobile
  const sidebarNav = wrapper.querySelector('#sidebar .sidebar-nav');
  if (sidebarNav) {
    const sidebarLinks = sidebarNav.querySelectorAll('button');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          setDrawerState(false);
        }
      });
    });
  }

  return wrapper;
}
