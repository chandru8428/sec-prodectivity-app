import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, query, where, deleteDoc, doc } from '/src/firebase.js';
import {
  db as supabaseDb,
  collection as sbCollection,
  getDocs as sbGetDocs,
  deleteDoc as sbDeleteDoc,
  doc as sbDoc,
} from '/src/supabase-adapter.js';
import { showToast } from '../../main.js';

export function render(root) {
  const layout = createLayout('Admin Dashboard', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <div class="flex items-center gap-3 mb-3">
        <h1 class="page-title" style="-webkit-text-fill-color:initial;background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">⚙️ Admin Control Center</h1>
        <span class="badge badge-admin">Administrator</span>
      </div>
      <p class="page-subtitle">Manage the EduSync platform — upload data, moderate content, and oversee student activity.</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-4 gap-4 mb-8" id="admin-stats">
      <div class="stat-card" style="border-top:2px solid transparent" id="as-students">
        <div class="stat-icon" style="background:rgba(114,9,183,0.15)">👥</div>
        <div class="stat-value" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card" id="as-schedules">
        <div class="stat-icon" style="background:rgba(67,97,238,0.15)">📅</div>
        <div class="stat-value">—</div>
        <div class="stat-label">Exam Schedules</div>
      </div>
      <div class="stat-card" id="as-posts">
        <div class="stat-icon" style="background:rgba(251,146,60,0.15)">💬</div>
        <div class="stat-value" style="background:var(--gradient-warning);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div class="stat-label">Q&A Posts</div>
        <div class="stat-change text-warning">Pending review</div>
      </div>
      <div class="stat-card" id="as-mappings">
        <div class="stat-icon" style="background:rgba(74,222,128,0.15)">🔗</div>
        <div class="stat-value" style="background:var(--gradient-success);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">—</div>
        <div class="stat-label">Repo Mappings</div>
      </div>
    </div>

    <!-- Action Grid -->
    <div class="grid grid-2 gap-6 mb-6">
      <!-- Upload Timetable -->
      <div class="glass-card">
        <div class="flex items-center gap-3 mb-4">
          <span style="font-size:28px">📤</span>
          <div>
            <h2 class="text-title">Upload Exam Timetable</h2>
            <p class="text-muted text-body-sm">Upload Excel/CSV exam schedule</p>
          </div>
          <a href="#/admin/upload-timetable" class="btn btn-primary btn-sm" style="margin-left:auto">Open</a>
        </div>
        <div id="recent-uploads" class="flex flex-col gap-2"></div>
      </div>

      <!-- Repo Mapping -->
      <div class="glass-card">
        <div class="flex items-center gap-3 mb-4">
          <span style="font-size:28px">🔗</span>
          <div>
            <h2 class="text-title">Subject-Repo Mapping</h2>
            <p class="text-muted text-body-sm">Manage GitHub repository links</p>
          </div>
          <a href="#/admin/repo-mapping" class="btn btn-primary btn-sm" style="margin-left:auto">Open</a>
        </div>
        <div id="recent-mappings" class="flex flex-col gap-2"></div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="grid grid-2 gap-6">
      <!-- Q&A Moderation -->
      <div class="glass-card" style="display:flex;flex-direction:column;">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span style="font-size:24px">🛡️</span>
            <h2 class="text-title">Q&A Moderation</h2>
          </div>
          <a href="#/admin/moderation" class="btn btn-secondary btn-sm">View All</a>
        </div>
        <div id="pending-posts" class="flex flex-col gap-3 flex-1 mb-6"></div>

        <!-- Danger Zone -->
        <div class="mt-auto pt-4" style="border-top:1px solid rgba(239,68,68,0.2);">
          <h2 class="text-title mb-3" style="color:var(--color-danger)">⚠️ Danger Zone</h2>
          <button id="btn-reset-db" class="btn btn-danger w-full flex items-center justify-center gap-2" style="background:#ef4444;color:white;padding:12px;border-radius:8px;font-weight:600;cursor:pointer;border:none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Clear Database Storage
          </button>
          <p style="font-size:11px;color:var(--color-on-surface-variant);text-align:center;margin-top:8px;">Deletes schedules, timetables, and attendance. Preserves Users, GPA, Q&A, & Repo Mappings.</p>
        </div>
      </div>

      <!-- Admin Quick Links -->
      <div class="glass-card">
        <h2 class="text-title mb-4">⚡ Quick Admin Actions</h2>
        <div class="flex flex-col gap-3">
          ${[
            { icon:'📤', label:'Upload Exam Timetable', desc:'Add/update student exam schedules', path:'/admin/upload-timetable' },
            { icon:'🔗', label:'Manage Repo Mappings', desc:'Map subjects to GitHub repositories', path:'/admin/repo-mapping' },
            { icon:'🛡️', label:'Moderate Q&A Board', desc:'Review and approve community posts', path:'/admin/moderation' },
            { icon:'📆', label:'Academic Calendar', desc:'Upload holidays and exam dates', path:'/admin/calendar' },
            { icon:'👥', label:'View All Students', desc:'Browse student profiles and records', path:'/admin/students' },
          ].map(a => `
            <a href="#${a.path}" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-lg);background:var(--color-surface-container-high);text-decoration:none;transition:var(--transition-fast)" class="admin-quick-link">
              <span style="font-size:20px">${a.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--font-body-sm);font-weight:600;color:var(--color-on-surface)">${a.label}</div>
                <div style="font-size:11px;color:var(--color-on-surface-variant)">${a.desc}</div>
              </div>
              <span style="color:var(--color-outline)">›</span>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Hover effect for quick links
  main.querySelectorAll('.admin-quick-link').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.background = 'rgba(114,9,183,0.1)'; });
    el.addEventListener('mouseleave', () => { el.style.background = 'var(--color-surface-container-high)'; });
  });

  // Handle Reset DB button
  main.querySelector('#btn-reset-db').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!confirm('🚨 WARNING: This will permanently delete all Exam Schedules, Timetables, and Attendance data. Are you absolutely sure?')) return;
    if (prompt('Type "DELETE" to confirm resetting the database:') !== 'DELETE') return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:white;border-top-color:transparent;display:inline-block;"></span> Clearing Data...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      // Collections to clear
      const collectionsToClear = ['examSchedules', 'timetables', 'attendance'];
      
      for (const table of collectionsToClear) {
        const snap = table === 'examSchedules'
          ? await sbGetDocs(sbCollection(supabaseDb, table))
          : await getDocs(collection(db, table));
        for (const document of snap.docs) {
          if (table === 'examSchedules') {
            await sbDeleteDoc(sbDoc(sbCollection(supabaseDb, table), document.id));
          } else {
            await deleteDoc(doc(collection(db, table), document.id));
          }
        }
      }

      showToast('Database successfully cleared! ✅', 'success', 4000);
      loadAdminStats(main); // Refresh the UI counts
    } catch (err) {
      console.error('Reset error:', err);
      showToast('Error resetting database: ' + err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });

  loadAdminStats(main);
}

async function loadAdminStats(main) {
  try {
    // Students
    const studentsSnap = await getDocs(query(collection(db, 'users'), where('role','==','student')));
    main.querySelector('#as-students .stat-value').textContent = studentsSnap.size;

    // Schedules
    const schedSnap = await sbGetDocs(sbCollection(supabaseDb, 'examSchedules'));
    main.querySelector('#as-schedules .stat-value').textContent = schedSnap.size;

    // Posts
    const postsSnap = await getDocs(collection(db, 'posts'));
    main.querySelector('#as-posts .stat-value').textContent = postsSnap.size;

    // Mappings
    const mapSnap = await sbGetDocs(sbCollection(supabaseDb, 'repoMappings'));
    main.querySelector('#as-mappings .stat-value').textContent = mapSnap.size;

    // Recent Uploads (group by subject)
    const subjects = [...new Set(schedSnap.docs.map(d => d.data().subject))].slice(0, 3);
    const recentEl = main.querySelector('#recent-uploads');
    recentEl.innerHTML = subjects.length > 0 ? subjects.map(s => `
      <div class="flex items-center gap-2" style="padding:var(--space-2) 0">
        <span style="color:var(--color-success);font-size:14px">✓</span>
        <span class="text-body-sm">${s}</span>
      </div>
    `).join('') : '<div class="text-muted text-body-sm">No schedules uploaded yet</div>';

    // Recent Mappings
    const recentMaps = mapSnap.docs.slice(0, 3).map(d => d.data());
    const mapsEl = main.querySelector('#recent-mappings');
    mapsEl.innerHTML = recentMaps.length > 0 ? recentMaps.map(m => `
      <div class="flex items-center gap-2" style="padding:var(--space-2) 0">
        <span class="badge badge-primary" style="font-size:10px">${m.subjectCode||'—'}</span>
        <span class="text-body-sm truncate" style="max-width:200px">${m.subjectName||'—'}</span>
        <span class="badge badge-success" style="margin-left:auto;font-size:10px">Active</span>
      </div>
    `).join('') : '<div class="text-muted text-body-sm">No mappings yet</div>';

    // Pending posts (latest 3)
    const recentPosts = postsSnap.docs.slice(0, 3);
    const postsEl = main.querySelector('#pending-posts');
    postsEl.innerHTML = recentPosts.length > 0 ? recentPosts.map(d => {
      const p = d.data();
      return `
        <div style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-lg);background:var(--color-surface-container-high)">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:var(--font-body-sm);color:var(--color-on-surface)">${p.title||'Untitled'}</div>
            <div style="font-size:11px;color:var(--color-on-surface-variant)">${p.subject||''} · ${p.authorName||''}</div>
          </div>
          <div class="flex gap-1">
            <button class="btn btn-success btn-sm" style="font-size:10px;padding:3px 8px" onclick="window.location.hash='#/admin/moderation'">Review</button>
          </div>
        </div>
      `;
    }).join('') : '<div class="text-muted text-body-sm" style="text-align:center;padding:var(--space-4)">No posts yet</div>';

  } catch (err) {
    console.warn('Admin stats error:', err);
  }
}
