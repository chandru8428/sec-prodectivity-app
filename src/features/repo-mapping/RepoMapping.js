import { createLayout } from '../../components/layout/Sidebar.js';
import { db, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from '../../lib/supabase-adapter.js';
import { showToast } from '../../app/main.js';

/* ── 20 Sample Lab Entries (seeded into Firestore via button) ── */
const SAMPLE_LABS = [
  // Compiler Design
  { subjectCode:'19CS409', subjectName:'Compiler Design', expNo:'01', title:'Implementation of Symbol Table',           repoUrl:'https://github.com/sample/symbol-table-implementation',   date:'2024-01-15' },
  { subjectCode:'19CS409', subjectName:'Compiler Design', expNo:'02', title:'Lexical Analyzer using LEX',                repoUrl:'https://github.com/sample/lexical-analyzer',              date:'2024-01-22' },
  { subjectCode:'19CS409', subjectName:'Compiler Design', expNo:'03', title:'Syntax Analyzer using YACC',                repoUrl:'https://github.com/sample/syntax-analyzer',               date:'2024-01-29' },
  { subjectCode:'19CS409', subjectName:'Compiler Design', expNo:'04', title:'Intermediate Code Generation',              repoUrl:'https://github.com/sample/intermediate-code-generation',  date:'2024-02-05' },
  { subjectCode:'19CS409', subjectName:'Compiler Design', expNo:'05', title:'Code Optimization Techniques',              repoUrl:'https://github.com/sample/code-optimization',             date:'2024-02-12' },
  // Data Structures
  { subjectCode:'19CS301', subjectName:'Data Structures Lab', expNo:'01', title:'Sorting Algorithms (Bubble, Quick, Merge)', repoUrl:'https://github.com/sample/sorting-algorithms',     date:'2024-01-15' },
  { subjectCode:'19CS301', subjectName:'Data Structures Lab', expNo:'02', title:'Graph Algorithms (BFS, DFS)',              repoUrl:'https://github.com/sample/graph-algorithms',           date:'2024-01-22' },
  { subjectCode:'19CS301', subjectName:'Data Structures Lab', expNo:'03', title:'Dynamic Programming',                     repoUrl:'https://github.com/sample/dynamic-programming',         date:'2024-01-29' },
  { subjectCode:'19CS301', subjectName:'Data Structures Lab', expNo:'04', title:'Linked List Operations',                  repoUrl:'https://github.com/sample/data-structures-lab',        date:'2024-02-05' },
  { subjectCode:'19CS301', subjectName:'Data Structures Lab', expNo:'05', title:'Stack and Queue Implementation',           repoUrl:'https://github.com/sample/data-structures-lab',        date:'2024-02-12' },
  // Operating Systems
  { subjectCode:'19CS405', subjectName:'Operating Systems Lab', expNo:'01', title:'CPU Scheduling Algorithms (FCFS, SJF, RR)', repoUrl:'https://github.com/sample/os-scheduling-algorithms', date:'2024-01-15' },
  { subjectCode:'19CS405', subjectName:'Operating Systems Lab', expNo:'02', title:'Memory Management (Paging)',              repoUrl:'https://github.com/sample/memory-management',           date:'2024-01-22' },
  { subjectCode:'19CS405', subjectName:'Operating Systems Lab', expNo:'03', title:'Deadlock Detection and Prevention',       repoUrl:'https://github.com/sample/os-scheduling-algorithms',    date:'2024-01-29' },
  { subjectCode:'19CS405', subjectName:'Operating Systems Lab', expNo:'04', title:'Process Synchronization',                repoUrl:'https://github.com/sample/memory-management',           date:'2024-02-05' },
  { subjectCode:'19CS405', subjectName:'Operating Systems Lab', expNo:'05', title:'File System Implementation',             repoUrl:'https://github.com/sample/os-scheduling-algorithms',    date:'2024-02-12' },
  // Computer Networks
  { subjectCode:'19CS501', subjectName:'Computer Networks Lab', expNo:'01', title:'Socket Programming (TCP/UDP)',            repoUrl:'https://github.com/sample/socket-programming',          date:'2024-01-15' },
  { subjectCode:'19CS501', subjectName:'Computer Networks Lab', expNo:'02', title:'Network Protocol Simulation',             repoUrl:'https://github.com/sample/network-protocols',           date:'2024-01-22' },
  { subjectCode:'19CS501', subjectName:'Computer Networks Lab', expNo:'03', title:'Wireshark Packet Analysis',               repoUrl:'https://github.com/sample/computer-networks-lab',       date:'2024-01-29' },
  { subjectCode:'19CS501', subjectName:'Computer Networks Lab', expNo:'04', title:'Routing Algorithms (OSPF, RIP)',           repoUrl:'https://github.com/sample/computer-networks-lab',       date:'2024-02-05' },
  { subjectCode:'19CS501', subjectName:'Computer Networks Lab', expNo:'05', title:'Cryptography Algorithms (RSA, AES)',       repoUrl:'https://github.com/sample/cryptography-lab',            date:'2024-02-12' },
];

export function render(root) {
  const layout = createLayout('Subject-Repo Mapping', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text"><i data-lucide="link-2" class="icon-inline"></i> Subject-Repo Mapping</h1>
      <p class="page-subtitle">Map subjects to GitHub repository templates for the Record Book PDF generator.</p>
    </div>

    <div class="grid gap-6" style="grid-template-columns:400px 1fr;align-items:start">

      <!-- Add Form -->
      <div class="glass-card" style="position:sticky;top:80px">
        <h2 class="text-title mb-4" id="mapping-form-title"><i data-lucide="plus" class="icon-inline"></i> Add New Mapping</h2>
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
            <label class="form-label">GitHub Repo URLs (comma separated)</label>
            <div class="form-input-wrapper">
              <span class="input-icon icon-left" style="font-size:14px"><i data-lucide="link-2" class="icon-inline"></i></span>
              <input class="form-input" id="m-repo" type="text" placeholder="user/repo1, user/repo2" required />
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
          <h2 class="text-title"><i data-lucide="clipboard-list" class="icon-inline"></i> All Mappings</h2>
          <div class="flex gap-3" style="flex-wrap:wrap">
            <div class="search-bar" style="max-width:200px">
              <span class="search-icon"><i data-lucide="search" class="icon-inline"></i></span>
              <input type="text" id="mapping-search" placeholder="Search..." />
            </div>
            <button class="btn btn-ghost btn-sm" id="refresh-maps"><i data-lucide="refresh-cw" class="icon-inline"></i></button>
            <button class="btn btn-secondary btn-sm" id="seed-sample-btn" style="font-size:12px;white-space:nowrap"><i data-lucide="flask-conical" class="icon-inline"></i> Seed Sample Labs</button>
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
      main.querySelector('#mapping-form-title').innerHTML = '<i data-lucide="plus" class="icon-inline"></i> Add New Mapping';
      main.querySelector('#cancel-edit').style.display = 'none';
      loadMappings(main);
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  main.querySelector('#cancel-edit').addEventListener('click', () => {
    form.reset();
    main.querySelector('#editing-id').value = '';
    main.querySelector('#mapping-form-title').innerHTML = '<i data-lucide="plus" class="icon-inline"></i> Add New Mapping';
    main.querySelector('#cancel-edit').style.display = 'none';
  });

  main.querySelector('#refresh-maps').addEventListener('click', () => loadMappings(main));

  /* Seed sample labs into Firestore */
  main.querySelector('#seed-sample-btn').addEventListener('click', async () => {
    const btn = main.querySelector('#seed-sample-btn');
    if (!confirm(`This will add ${SAMPLE_LABS.length} sample lab entries to the repo mapping. Continue?`)) return;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="hourglass" class="icon-inline"></i> Seeding...';
    let added = 0, skipped = 0;
    try {
      // Check existing to avoid duplicates
      const snap = await getDocs(collection(db, 'repoMappings'));
      const existing = snap.docs.map(d => d.data());
      for (const lab of SAMPLE_LABS) {
        const isDuplicate = existing.some(e =>
          e.subjectCode === lab.subjectCode &&
          e.expNo === lab.expNo &&
          e.title?.toLowerCase() === lab.title?.toLowerCase()
        );
        if (isDuplicate) { skipped++; continue; }
        await addDoc(collection(db, 'repoMappings'), {
          ...lab,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        added++;
      }
      showToast(`<i data-lucide="check-circle-2" class="icon-inline"></i> Seeded ${added} labs! (${skipped} already existed)`, 'success', 4000);
      loadMappings(main);
    } catch (err) {
      showToast('Seed failed: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="flask-conical" class="icon-inline"></i> Seed Sample Labs';
  });

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
    main.querySelector('#mapping-form-title').innerHTML = '<i data-lucide="pencil" class="icon-inline"></i> Edit Mapping';
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
      return `
        <tr>
          <td><span class="badge badge-primary">${m.subjectCode||'—'}</span></td>
          <td style="font-weight:600;max-width:160px" class="truncate">${m.subjectName||'—'}</td>
          <td style="text-align:center">${m.expNo||'—'}</td>
          <td style="max-width:200px" class="truncate">${m.title||'—'}</td>
          <td>
            ${(m.repoUrl || '').split(',').map(url => {
              const cleanUrl = url.trim();
              const shortUrl = cleanUrl.replace('https://github.com/','') || '—';
              return `<a href="${cleanUrl}" target="_blank" style="font-size:11px;color:var(--color-secondary);text-decoration:none;display:block" class="truncate" title="${cleanUrl}">
                <i data-lucide="link-2" class="icon-inline"></i> ${shortUrl}
              </a>`;
            }).join('') || '—'}
          </td>
          <td><span class="badge badge-success"><i data-lucide="check" class="icon-inline"></i> Active</span></td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-secondary btn-sm" onclick="_editMapping('${m.id}')"><i data-lucide="pencil" class="icon-inline"></i></button>
              <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" onclick="deleteMapping('${m.id}')"><i data-lucide="trash-2" class="icon-inline"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger"><span><i data-lucide="alert-triangle" class="icon-inline"></i>️</span><span>${err.message}</span></div></td></tr>`;
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
