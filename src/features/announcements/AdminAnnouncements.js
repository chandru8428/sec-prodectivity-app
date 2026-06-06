import { createLayout } from '../../components/layout/Sidebar.js';
import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from '../../lib/supabase-adapter.js';
import { showToast, appState } from '../../app/main.js';

export function render(root) {
  const layout = createLayout('Announcements', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title"><i data-lucide="megaphone" class="icon-inline"></i> Broadcast Announcements</h1>
      <p class="page-subtitle">Send important updates, alerts, and news directly to all student dashboards.</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns: 1fr 1fr;">
      
      <!-- Create Announcement Form -->
      <div class="glass-card">
        <h2 class="text-title mb-4">Create New Announcement</h2>
        <form id="announcement-form" class="flex flex-col gap-4">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" id="ann-title" class="form-input" required placeholder="e.g. Server Maintenance, Holiday Declared" />
          </div>
          
          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea id="ann-message" class="form-input" required placeholder="Detailed message..." rows="4" style="resize:vertical"></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Urgency Type</label>
            <select id="ann-type" class="form-input">
              <option value="info">ℹ️ Information (Blue)</option>
              <option value="warning"><i data-lucide="alert-triangle" class="icon-inline"></i>️ Warning (Yellow)</option>
              <option value="success"><i data-lucide="check-circle-2" class="icon-inline"></i> Success (Green)</option>
              <option value="danger"><i data-lucide="siren" class="icon-inline"></i> Urgent / Danger (Red)</option>
            </select>
          </div>
          
          <button type="submit" class="btn btn-primary mt-2" id="btn-submit">Broadcast Announcement</button>
        </form>
      </div>

      <!-- Existing Announcements List -->
      <div class="glass-card flex flex-col h-full">
        <h2 class="text-title mb-4">Active Announcements</h2>
        <div id="announcement-list" class="flex flex-col gap-3 overflow-y-auto" style="max-height: 500px; padding-right: 8px;">
          <div class="text-muted text-body-sm text-center py-4">Loading announcements...</div>
        </div>
      </div>

    </div>
  `;

  const form = main.querySelector('#announcement-form');
  const btnSubmit = main.querySelector('#btn-submit');
  
  // Submit new announcement
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = main.querySelector('#ann-title').value.trim();
    const message = main.querySelector('#ann-message').value.trim();
    const type = main.querySelector('#ann-type').value;

    if (!title || !message) return;

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Broadcasting...';

    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        message,
        type,
        createdAt: new Date().toISOString(),
        createdBy: appState.userData?.name || 'Admin'
      });
      showToast('Announcement broadcasted successfully!', 'success');
      form.reset();
      loadAnnouncements(main);
    } catch (err) {
      console.error('Error adding announcement:', err);
      showToast('Failed to broadcast announcement.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Broadcast Announcement';
    }
  });

  loadAnnouncements(main);
}

async function loadAnnouncements(main) {
  const listContainer = main.querySelector('#announcement-list');
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      listContainer.innerHTML = '<div class="text-muted text-body-sm text-center py-4">No active announcements.</div>';
      return;
    }

    const typeColors = {
      info: 'var(--color-primary)',
      warning: 'var(--color-warning)',
      success: 'var(--color-success)',
      danger: 'var(--color-danger)'
    };

    const typeIcons = {
      info: 'ℹ️',
      warning: '<i data-lucide="alert-triangle" class="icon-inline"></i>️',
      success: '<i data-lucide="check-circle-2" class="icon-inline"></i>',
      danger: '<i data-lucide="siren" class="icon-inline"></i>'
    };

    listContainer.innerHTML = snap.docs.map(docSnap => {
      const data = docSnap.data();
      const color = typeColors[data.type] || typeColors.info;
      const icon = typeIcons[data.type] || typeIcons.info;
      const date = new Date(data.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
      });

      return `
        <div class="announcement-item" style="border-left: 4px solid ${color}; background: var(--color-surface-container-high); padding: 12px 16px; border-radius: 8px;">
          <div class="flex justify-between items-start mb-1">
            <h3 style="font-weight: 700; color: var(--color-on-surface); font-size: 15px; display:flex; align-items:center; gap:6px;">
              <span>${icon}</span> ${data.title}
            </h3>
            <button class="btn btn-ghost btn-sm text-danger delete-ann-btn" data-id="${docSnap.id}" style="padding: 4px; border-radius: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <p style="font-size: 13px; color: var(--color-on-surface-variant); margin-bottom: 8px; line-height: 1.4;">${data.message}</p>
          <div style="font-size: 11px; color: var(--color-outline);">Broadcasted on ${date} by ${data.createdBy || 'Admin'}</div>
        </div>
      `;
    }).join('');

    // Attach delete listeners
    listContainer.querySelectorAll('.delete-ann-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        
        try {
          await deleteDoc(doc(db, 'announcements', id));
          showToast('Announcement deleted', 'success');
          loadAnnouncements(main);
        } catch (err) {
          console.error('Delete error:', err);
          showToast('Failed to delete', 'error');
        }
      });
    });

  } catch (err) {
    console.error('Load announcements error:', err);
    listContainer.innerHTML = '<div class="text-danger text-body-sm text-center py-4">Failed to load announcements.</div>';
  }
}
