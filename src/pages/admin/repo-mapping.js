import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from '/src/supabase-adapter.js';
import { showToast } from '../../main.js';

export function render(root) {
  const layout = createLayout('Subject-Repo Mapping', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🔗 Subject-Repo Mapping</h1>
      <p class="page-subtitle">Map subjects to GitHub repository templates for the Record Book PDF generator.</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns:400px 1fr;align-items:start">

      <!-- Add Form -->
      <div class="glass-card" style="position:sticky;top:80px">
        <h2 class="text-title mb-4" id="mapping-form-title">➕ Add New Mapping</h2>
        <form id="mapping-form" class="flex flex-col gap-4">
          <input type="hidden" id="editing-id" />
          <div class="form-group">
            <label class="form-label">Subject Code</label>
            <input class="form-input" id="m-code" type="text" placeholder="19CS409" required />
          </div>
          <div class="form-group">
            <label class="form-label">Subject Name</label>
            <input class="form-input" id="m-name" type="text" placeholder="Compiler Design" required />
          </div>
          <div class="form-group">
            <label class="form-label">Experiment No.</label>
            <input class="form-input" id="m-expno" type="text" placeholder="01" />
          </div>
          <div class="form-group">
            <label class="form-label">Experiment Title</label>
            <input class="form-input" id="m-title" type="text" placeholder="Implementation of Symbol Table" required />
          </div>
          <div class="form-group">
            <label class="form-label">GitHub Repo URL</label>
            <div class="form-input-wrapper">
              <span class="input-icon icon-left" style="font-size:14px">🔗</span>
              <input class="form-input" id="m-repo" type="url" placeholder="https://github.com/user/repo" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Experiment Date</label>
            <input class="form-input" id="m-date" type="date" />
          </div>
          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" id="save-mapping-btn">Save Mapping</button>
            <button type="button" class="btn btn-ghost" id="cancel-edit" style="display:none">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Mapping Table -->
      <div class="glass-card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-title">📋 All Mappings</h2>
          <div class="flex gap-3">
            <div class="search-bar" style="max-width:200px">
              <span class="search-icon">🔍</span>
              <input type="text" id="mapping-search" placeholder="Search..." />
            </div>
            <button class="btn btn-ghost btn-sm" id="refresh-maps">🔄</button>
          </div>
        </div>
        <div class="table-wrapper" style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Subject</th><th>Exp</th><th>Experiment Title</th><th>Repo URL</th><th>QR Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="mappings-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const form = main.querySelector('#mapping-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingId = main.querySelector('#editing-id').value;
    const data = {
      subjectCode:   main.querySelector('#m-code').value.trim(),
      subjectName:   main.querySelector('#m-name').value.trim(),
      expNo:         main.querySelector('#m-expno').value.trim(),
      title:         main.querySelector('#m-title').value.trim(),
      repoUrl:       main.querySelector('#m-repo').value.trim(),
      date:          main.querySelector('#m-date').value,
      updatedAt:     serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'repoMappings', editingId), data);
        showToast('Mapping updated!', 'success');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'repoMappings'), data);
        showToast('Mapping added!', 'success');
      }
      form.reset();
      main.querySelector('#editing-id').value = '';
      main.querySelector('#mapping-form-title').textContent = '➕ Add New Mapping';
      main.querySelector('#cancel-edit').style.display = 'none';
      loadMappings(main);
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  main.querySelector('#cancel-edit').addEventListener('click', () => {
    form.reset();
    main.querySelector('#editing-id').value = '';
    main.querySelector('#mapping-form-title').textContent = '➕ Add New Mapping';
    main.querySelector('#cancel-edit').style.display = 'none';
  });

  main.querySelector('#refresh-maps').addEventListener('click', () => loadMappings(main));

  let searchTimeout;
  main.querySelector('#mapping-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadMappings(main, e.target.value.trim()), 300);
  });

  loadMappings(main);

  window._editMapping = async function(id) {
    const snap = await getDocs(collection(db, 'repoMappings'));
    const entry = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(m => m.id === id);
    if (!entry) return;
    main.querySelector('#editing-id').value = id;
    main.querySelector('#m-code').value  = entry.subjectCode || '';
    main.querySelector('#m-name').value  = entry.subjectName || '';
    main.querySelector('#m-expno').value = entry.expNo || '';
    main.querySelector('#m-title').value = entry.title || '';
    main.querySelector('#m-repo').value  = entry.repoUrl || '';
    main.querySelector('#m-date').value  = entry.date || '';
    main.querySelector('#mapping-form-title').textContent = '✏️ Edit Mapping';
    main.querySelector('#cancel-edit').style.display = '';
    main.querySelector('#m-code').focus();
    showToast('Editing mapping — update and save', 'info');
  };
}

async function loadMappings(main, search = '') {
  const tbody = main.querySelector('#mappings-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--color-on-surface-variant);padding:24px">Loading...</td></tr>';
  try {
    const snap = await getDocs(collection(db, 'repoMappings'));
    let mappings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (search) {
      const s = search.toLowerCase();
      mappings = mappings.filter(m =>
        m.subjectCode?.toLowerCase().includes(s) ||
        m.subjectName?.toLowerCase().includes(s) ||
        m.title?.toLowerCase().includes(s)
      );
    }

    if (mappings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--color-on-surface-variant);padding:24px">No mappings found</td></tr>';
      return;
    }

    tbody.innerHTML = mappings.map(m => {
      const shortUrl = m.repoUrl?.replace('https://github.com/','') || '—';
      return `
        <tr>
          <td><span class="badge badge-primary">${m.subjectCode||'—'}</span></td>
          <td style="font-weight:600;max-width:160px" class="truncate">${m.subjectName||'—'}</td>
          <td style="text-align:center">${m.expNo||'—'}</td>
          <td style="max-width:200px" class="truncate">${m.title||'—'}</td>
          <td>
            <a href="${m.repoUrl}" target="_blank" style="font-size:11px;color:var(--color-secondary);text-decoration:none" class="truncate" title="${m.repoUrl}">
              🔗 ${shortUrl}
            </a>
          </td>
          <td><span class="badge badge-success">✓ Active</span></td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-secondary btn-sm" onclick="_editMapping('${m.id}')">✏️</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" onclick="deleteMapping('${m.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger"><span>⚠️</span><span>${err.message}</span></div></td></tr>`;
  }
}

window.deleteMapping = async function(id) {
  if (!confirm('Delete this mapping?')) return;
  try {
    await deleteDoc(doc(db, 'repoMappings', id));
    showToast('Mapping deleted', 'success');
    document.querySelector('#refresh-maps')?.click();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
};
