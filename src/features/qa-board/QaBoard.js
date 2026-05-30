import { createLayout } from '../../components/layout/Sidebar.js';
import { appState, showToast } from '../../app/main.js';
import {
  db, collection, getDocs, addDoc,
  updateDoc, deleteDoc, doc, increment, serverTimestamp,
  arrayUnion, arrayRemove
} from '../../lib/firebase.js';
import { uploadToCloudinary, compressImage, formatBytes } from '../../services/cloudinary-service.js';

let currentFilter = { type: 'all', subject: '' };

// ── Pending attachments for the current draft post ──────────────────────────
let pendingFiles = []; // { file, previewUrl, type: 'image'|'pdf' }

export function render(root) {
  const layout = createLayout('Knowledge Exchange', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <style>
      /* ── Filter bar ── */
      .qa-filter-bar {
        display:flex; align-items:center; gap:10px; flex-wrap:wrap;
        background:var(--color-surface-container); border:1px solid var(--border-color);
        border-radius:var(--radius-xl); padding:12px 16px; margin-bottom:20px;
      }
      .qa-search-wrap {
        display:flex; align-items:center; gap:8px;
        background:var(--color-surface); border:1px solid var(--border-color);
        border-radius:var(--radius-full); padding:7px 14px;
        flex:1; min-width:160px;
      }
      .qa-search-wrap input {
        border:none; background:transparent; outline:none;
        font-size:13px; color:var(--color-on-surface); width:100%;
      }
      .qa-chips { display:flex; gap:6px; flex-wrap:wrap; }
      .qa-chip {
        padding:5px 13px; border-radius:var(--radius-full);
        border:1px solid var(--border-color); background:var(--color-surface);
        font-size:12px; font-weight:600; cursor:pointer;
        color:var(--color-on-surface-variant); transition:all 0.15s; white-space:nowrap;
      }
      .qa-chip.active {
        background:var(--gradient-primary, var(--color-primary)); border-color:var(--color-primary);
        color:#fff; box-shadow:0 2px 8px rgba(216,155,41,0.25);
      }
      .qa-sem-sel {
        padding:6px 12px; border-radius:var(--radius-full);
        border:1px solid var(--border-color); background:var(--color-surface);
        font-size:12px; font-weight:600; color:var(--color-on-surface-variant);
        cursor:pointer; outline:none;
      }
      /* ── Post cards ── */
      .qa-card {
        background:var(--color-surface-container);
        border:1px solid var(--border-color);
        border-radius:var(--radius-xl);
        padding:18px 20px;
        transition:box-shadow 0.18s, transform 0.15s;
      }
      .qa-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.08); transform:translateY(-1px); }
      .qa-card.pinned { border-color:var(--color-primary); }
      .qa-card-head {
        display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;
      }
      .qa-author { display:flex; align-items:center; gap:10px; }
      .qa-avatar {
        width:36px; height:36px; border-radius:10px;
        background:var(--gradient-primary); color:#fff;
        font-weight:700; font-size:14px;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      .qa-author-name { font-size:13px; font-weight:700; color:var(--color-on-surface); }
      .qa-author-reg  { font-size:11px; color:var(--color-on-surface-variant); }
      .qa-type-pill {
        padding:4px 11px; border-radius:var(--radius-full);
        font-size:11px; font-weight:700; flex-shrink:0; white-space:nowrap;
      }
      .tp-question { background:#EEF2FF; color:#4F46E5; }
      .tp-tip      { background:#FFFBEB; color:#B45309; }
      .tp-answer   { background:#F0FDF4; color:#16A34A; }
      .qa-title {
        font-size:15px; font-weight:700; color:var(--color-on-surface);
        margin:0 0 6px; line-height:1.4;
      }
      .qa-body {
        font-size:13px; color:var(--color-on-surface-variant);
        line-height:1.6; margin:0 0 12px;
        display:-webkit-box; -webkit-line-clamp:2;
        -webkit-box-orient:vertical; overflow:hidden;
      }
      .qa-footer {
        display:flex; align-items:center; gap:8px; flex-wrap:wrap;
        border-top:1px solid var(--border-color); padding-top:10px;
      }
      .qa-tag {
        display:inline-flex; align-items:center; gap:4px;
        padding:3px 9px; border-radius:var(--radius-full);
        font-size:11px; font-weight:600;
        background:var(--color-surface-container-high);
        color:var(--color-on-surface-variant);
        border:1px solid var(--border-color);
      }
      .qa-tag-subj { background:#F5F3FF; color:#7C3AED; border-color:#DDD6FE; }
      .qa-tag-sem  { background:#F0F9FF; color:#0369A1; border-color:#BAE6FD; }
      .qa-time { font-size:11px; color:var(--color-on-surface-variant); margin-left:auto; }
      .qa-vote {
        display:inline-flex; align-items:center; gap:5px;
        padding:4px 12px; border-radius:var(--radius-full);
        border:1px solid var(--border-color); background:var(--color-surface);
        font-size:12px; font-weight:600; cursor:pointer;
        color:var(--color-on-surface); transition:all 0.15s;
      }
      .qa-vote .vote-count {
        color: inherit !important;
      }
      .qa-vote:hover { border-color:var(--color-primary); color:var(--color-primary); }
      .qa-vote.active {
        background:var(--color-primary-container, var(--color-primary));
        color:var(--color-on-primary-container, #fff);
        border-color:var(--color-primary);
      }
      /* ── Attachment drop-zone ── */
      .drop-zone {
        border: 2px dashed var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        background: var(--color-surface-container-low);
        position: relative;
      }
      .drop-zone.drag-over {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, transparent);
      }
      .drop-zone input[type="file"] {
        position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
      }
      .attach-preview-grid {
        display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3);
      }
      .attach-thumb {
        position: relative; width: 72px; height: 72px; border-radius: var(--radius-md);
        overflow: hidden; border: 1px solid var(--border-color); flex-shrink: 0;
        background: var(--color-surface-container);
      }
      .attach-thumb img { width:100%; height:100%; object-fit:cover; }
      .attach-thumb .pdf-icon {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:100%; font-size:22px; gap:2px;
      }
      .attach-thumb .pdf-icon span { font-size:9px; color:var(--color-on-surface-variant); text-align:center; padding:0 4px; line-height:1.2; overflow:hidden; }
      .attach-thumb .remove-attach {
        position:absolute; top:2px; right:2px; width:18px; height:18px;
        background:var(--color-danger,#e53e3e); color:#fff; border-radius:50%;
        border:none; cursor:pointer; font-size:10px; line-height:18px; text-align:center;
        display:flex; align-items:center; justify-content:center;
      }
      /* ── Upload progress ── */
      .upload-progress-bar {
        height: 4px; background: var(--color-surface-container-high);
        border-radius: 2px; overflow: hidden; margin-top: var(--space-2);
      }
      .upload-progress-bar .fill {
        height:100%; background: var(--color-primary); width:0%;
        transition: width 0.2s;
      }
      /* ── Post attachment display ── */
      .post-attachments { display:flex; flex-wrap:wrap; gap:var(--space-2); margin-top:var(--space-3); }
      .post-img-thumb {
        width: 90px; height: 70px; object-fit:cover; border-radius:var(--radius-md);
        border:1px solid var(--border-color); cursor:pointer;
        transition: transform 0.15s;
      }
      .post-img-thumb:hover { transform:scale(1.04); }
      .post-pdf-chip {
        display:inline-flex; align-items:center; gap:6px;
        padding:4px 10px; border-radius:var(--radius-full);
        background:var(--color-surface-container-high);
        border:1px solid var(--border-color);
        font-size:12px; color:var(--color-on-surface-variant);
        cursor:pointer; text-decoration:none;
      }
      /* ── Lightbox ── */
      .qa-lightbox {
        position:fixed; inset:0; background:rgba(0,0,0,0.85);
        display:flex; align-items:center; justify-content:center;
        z-index:9999; cursor:zoom-out;
      }
      .qa-lightbox img { max-width:92vw; max-height:92vh; border-radius:var(--radius-xl); }
      .qa-lightbox-close {
        position:absolute; top:16px; right:20px; background:rgba(255,255,255,0.15);
        border:none; color:#fff; border-radius:50%; width:36px; height:36px;
        font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;
      }

      /* ── Modal & Glassmorphism ── */
      .modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      }
      .modal-backdrop.show { opacity: 1; pointer-events: auto; }
      body.modal-open { overflow: hidden; }
      
      .modal-content {
        background: var(--color-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-2xl);
        width: 100%; max-width: 540px;
        padding: 24px; margin: 20px;
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        max-height: 90vh; overflow-y: auto;
      }
      .modal-backdrop.show .modal-content {
        transform: translateY(0) scale(1);
      }
      .modal-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      }
      .modal-close {
        background: var(--color-surface-container-high); border: none; color: var(--color-on-surface-variant);
        width: 32px; height: 32px; border-radius: 50%;
        font-size: 16px; cursor: pointer; transition: all 0.2s; 
        display: flex; align-items: center; justify-content: center;
      }
      .modal-close:hover { color: var(--color-on-surface); background: var(--color-surface-container-highest); transform: scale(1.1); }
      
      .btn-glow {
        position: relative; overflow: hidden;
      }
      .btn-glow::after {
        content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
        opacity: 0; transition: opacity 0.3s; transform: scale(0.5); pointer-events:none;
      }
      .btn-glow:hover::after { opacity: 1; transform: scale(1); }

      /* ── FAB ── */
      .fab-create {
        position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
        border-radius: 50%; background: var(--gradient-primary, var(--color-primary)); color: white;
        display: none; align-items: center; justify-content: center; font-size: 28px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3); border: none; cursor: pointer;
        z-index: 990; transition: transform 0.2s, box-shadow 0.2s;
        line-height: 1; padding-bottom: 4px;
      }
      .fab-create:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
      @media (max-width: 768px) {
        .fab-create { display: flex; }
        .desktop-create-btn { display: none !important; }
        .qa-filter-bar { padding: 12px; }
      }
    </style>

    <div class="page-header" style="margin-bottom:4px">
      <h1 class="page-title">💬 Exam Q&A Board</h1>
    </div>

    <!-- Filter bar — full width above the two-column grid -->
    <div class="qa-filter-bar">
      <div class="qa-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="qa-search" placeholder="Search questions, tips, answer keys…" />
      </div>
      <div class="qa-chips" id="type-filters">
        <button class="qa-chip active" data-type="all">All</button>
        <button class="qa-chip" data-type="question">❓ Questions</button>
        <button class="qa-chip" data-type="tip">💡 Tips</button>
        <button class="qa-chip" data-type="answer">✅ Answer Keys</button>
      </div>
      <button class="btn btn-primary desktop-create-btn btn-glow" id="open-create-modal" style="margin-left:auto; border-radius:var(--radius-full); padding:8px 16px; font-weight:600;">
        <span style="font-size:16px; margin-right:4px;">+</span> Create Post
      </button>
    </div>

    <!-- Layout: Single column or Two columns if we want trending on the right. Let's make feed wider and trending on right -->
    <div class="grid gap-6" style="grid-template-columns:1fr 300px;align-items:start">

      <!-- Left: Feed -->
      <div>
        <div id="posts-list" class="flex flex-col gap-4">
          <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
          <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
          <div class="skeleton" style="height:120px;border-radius:var(--radius-xl)"></div>
        </div>
      </div>

      <!-- Right: Trending -->
      <div class="flex flex-col gap-4" style="position:sticky;top:80px">
        <div class="glass-card">
          <h3 class="text-title mb-4">🔥 Trending Topics</h3>
          <div id="trending-list" class="flex flex-col gap-2">
            <div class="text-muted text-body-sm" style="text-align:center">Loading...</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile FAB -->
    <button class="fab-create" id="mobile-create-fab">+</button>

    <!-- ── Create Post Modal ── -->
    <div class="modal-backdrop" id="create-post-modal">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="text-title" style="margin:0; font-size:1.25rem;">✏️ Create Post</h3>
          <button class="modal-close" id="close-modal-btn">✕</button>
        </div>
        
        <form id="post-form" class="flex flex-col gap-3">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="post-title" type="text" placeholder="What's your question or tip?" required />
          </div>
          <div class="form-group">
            <label class="form-label">Content</label>
            <textarea class="form-textarea" id="post-content" placeholder="Write your detailed post here..." required rows="4"></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input class="form-input" id="post-subject" type="text" placeholder="Subject name" required />
          </div>
            
          <div class="form-group">
            <label class="form-label">Post Type</label>
            <div class="flex gap-2">
              ${['question','tip','answer'].map(t => `
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-body-sm);color:var(--color-on-surface-variant)">
                  <input type="radio" name="post-type" value="${t}" ${t==='question'?'checked':''} style="accent-color:var(--color-primary-container)">
                  ${t==='question'?'❓ Question':t==='tip'?'💡 Tip':'✅ Answer Key'}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- ── Attach files ── -->
          <div class="form-group">
            <label class="form-label">📎 Attachments <span style="font-weight:400;color:var(--color-on-surface-variant)">(images & PDFs, max 5)</span></label>
            <div class="drop-zone" id="drop-zone">
              <input type="file" id="file-input" accept="image/*,.pdf" multiple />
              <div style="pointer-events:none">
                <div style="font-size:28px;margin-bottom:4px">📂</div>
                <p style="font-size:var(--font-body-sm);color:var(--color-on-surface-variant);margin:0">
                  Drag & drop or <strong>click to browse</strong>
                </p>
                <p style="font-size:11px;color:var(--color-on-surface-variant);margin:4px 0 0">
                  Images are auto-compressed · PDFs up to 10 MB
                </p>
              </div>
            </div>
            <div class="attach-preview-grid" id="attach-preview"></div>
            <div class="upload-progress-bar" id="progress-wrap" style="display:none">
              <div class="fill" id="progress-fill"></div>
            </div>
            <p id="upload-status" style="font-size:11px;color:var(--color-on-surface-variant);margin-top:4px;display:none"></p>
          </div>

          <button type="submit" class="btn btn-primary w-full btn-glow" id="post-submit-btn" style="margin-top:8px; padding:10px; font-weight:600;">🚀 Post</button>
        </form>
      </div>
    </div>
  `;

  loadPosts(main);
  setupFilters(main);

  // Move modal out of main to escape stacking context
  const modal = main.querySelector('#create-post-modal');
  if (modal) layout.appendChild(modal);

  setupPostForm(main);
  setupDropZone();
  setupModal(main);
}

function setupModal(main) {
  const modal = document.getElementById('create-post-modal');
  const openBtn = main.querySelector('#open-create-modal');
  const fabBtn = main.querySelector('#mobile-create-fab');
  const closeBtn = document.getElementById('close-modal-btn');
  const titleInput = document.getElementById('post-title');
  
  const openModal = () => {
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    setTimeout(() => titleInput.focus(), 300); // Focus after animation
    
    // Reset if it was an edit modal and they just clicked "Create"
    if (window._editingPostId) {
      window.cancelEdit();
    }
  };
  
  const closeModal = () => {
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    window.cancelEdit(); // Reset form state just in case
  };
  
  openBtn.addEventListener('click', openModal);
  fabBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });
  
  window._openPostModal = openModal;
  window._closePostModal = closeModal;
}

// ── File attachment drop-zone ────────────────────────────────────────────────

function setupDropZone() {
  const zone    = document.getElementById('drop-zone');
  const input   = document.getElementById('file-input');
  const preview = document.getElementById('attach-preview');

  const handleFiles = (files) => {
    const allowed = [...files].filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (allowed.length === 0) { showToast('Only images and PDFs are supported.', 'error'); return; }
    if (pendingFiles.length + allowed.length > 5) {
      showToast('Maximum 5 attachments per post.', 'error');
      return;
    }
    allowed.forEach(file => {
      const type = file.type === 'application/pdf' ? 'pdf' : 'image';
      const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
      pendingFiles.push({ file, previewUrl, type });
    });
    renderAttachPreviews(preview);
  };

  input.addEventListener('change', () => handleFiles(input.files));

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
}

function renderAttachPreviews(container) {
  container.innerHTML = pendingFiles.map((item, idx) => `
    <div class="attach-thumb">
      ${item.type === 'image'
        ? `<img src="${item.previewUrl}" alt="preview" />`
        : `<div class="pdf-icon">📄<span>${item.file.name}</span></div>`
      }
      <button class="remove-attach" data-idx="${idx}" title="Remove">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.remove-attach').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (pendingFiles[idx].previewUrl) URL.revokeObjectURL(pendingFiles[idx].previewUrl);
      pendingFiles.splice(idx, 1);
      renderAttachPreviews(container);
    });
  });
}

// ── Posts ────────────────────────────────────────────────────────────────────

async function loadPosts(main) {
  const container = main.querySelector('#posts-list');
  try {
    const snap = await getDocs(collection(db, 'posts'));
    const allPosts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    window._allPosts = allPosts;
    renderPosts(container, allPosts, main);
    renderTrending(main.querySelector('#trending-list'), allPosts);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger"><span>⚠️</span><span>Failed to load posts: ${err.message}</span></div>`;
  }
}

function renderPosts(container, posts, main) {
  const search   = main.querySelector('#qa-search').value.toLowerCase();
  const type     = currentFilter.type;

  let filtered = posts.filter(p => {
    const matchSearch   = !search || p.title?.toLowerCase().includes(search) || p.content?.toLowerCase().includes(search);
    const matchType     = type === 'all' || p.type === type;
    return matchSearch && matchType;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="text-align:center;padding:var(--space-10)">
        <div style="font-size:48px;margin-bottom:var(--space-4)">📭</div>
        <h3 class="text-title">No posts found</h3>
        <p class="text-muted text-body-sm" style="margin-top:var(--space-2)">Be the first to post something!</p>
      </div>
    `;
    return;
  }

  const isAdmin = appState.userRole === 'admin';
  const tpClass = { question:'tp-question', tip:'tp-tip', answer:'tp-answer' };
  const tpLabel = { question:'❓ Question', tip:'💡 Tip', answer:'✅ Answer Key' };

  container.innerHTML = filtered.map(post => {
    const pinned  = post.pinned;
    const timeAgo = getTimeAgo(post.createdAt?.toDate?.() || new Date(post.createdAt));
    const attachHtml = buildAttachmentHtml(post.attachments);
    const tc = tpClass[post.type] || 'tp-question';
    const tl = tpLabel[post.type] || 'Post';

    return `
      <div class="qa-card ${pinned ? 'pinned' : ''}" id="post-${post.id}">
        <div class="qa-card-head">
          <div class="qa-author">
            <div class="qa-avatar">${(post.authorName||'a')[0].toUpperCase()}</div>
            <div>
              <div class="qa-author-name">${post.authorName||'Aravind P'}${pinned ? ' <span title="Pinned">📌</span>' : ''}</div>
              <div class="qa-author-reg">${post.registerNumber||'212224240015'}</div>
            </div>
          </div>
          <span class="qa-type-pill ${tc}">${tl}</span>
        </div>
        <h4 class="qa-title">${post.title}</h4>
        <p class="qa-body">${post.content}</p>
        ${attachHtml}
        <div class="qa-footer">
          <span class="qa-tag qa-tag-subj">📚 ${post.subject}</span>
          ${post.semester ? `<span class="qa-tag qa-tag-sem">Sem ${post.semester}</span>` : ''}
          <span class="qa-time">${timeAgo}</span>
          <button class="qa-vote upvote-btn ${post.upvotedBy?.includes(appState.currentUser?.uid) ? 'active' : ''}" data-id="${post.id}">
            ▲ <span class="vote-count">${post.upvotedBy?.length ?? post.votes ?? 0}</span>
          </button>
          ${(isAdmin || post.authorId === appState.currentUser?.uid) ? `
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="moderatePost('${post.id}','pin')" title="Pin/Unpin" style="padding:4px 8px">📌</button>` : ''}
            ${post.authorId === appState.currentUser?.uid ? `<button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="editPost('${post.id}')" title="Edit">✏️</button>` : ''}
            <button class="btn btn-sm" style="background-color:#ef4444;color:white;border:none;padding:4px 8px;display:flex;align-items:center;gap:4px;" onclick="moderatePost('${post.id}','delete')" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Upvote handlers
  container.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const uid = appState.currentUser?.uid;
      if (!uid) { showToast('Please login to upvote', 'error'); return; }

      const post = window._allPosts.find(p => p.id === id);
      if (!post) return;

      const isUpvoted = post.upvotedBy?.includes(uid);
      const countSpan = btn.querySelector('.vote-count');
      const currentCount = post.upvotedBy?.length ?? post.votes ?? 0;

      try {
        if (isUpvoted) {
          await updateDoc(doc(db, 'posts', id), { upvotedBy: arrayRemove(uid) });
          post.upvotedBy = post.upvotedBy.filter(u => u !== uid);
          btn.classList.remove('active');
          countSpan.textContent = currentCount - 1;
        } else {
          if (!post.upvotedBy) post.upvotedBy = [];
          await updateDoc(doc(db, 'posts', id), { upvotedBy: arrayUnion(uid) });
          post.upvotedBy.push(uid);
          btn.classList.add('active');
          countSpan.textContent = currentCount + 1;
        }
      } catch (err) {
        showToast('Failed to toggle upvote', 'error');
      }
    });
  });

  // Image lightbox
  container.querySelectorAll('.post-img-thumb').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

function buildAttachmentHtml(attachments) {
  if (!attachments || attachments.length === 0) return '';
  const items = attachments.map(a => {
    if (a.type === 'image') {
      return `<img class="post-img-thumb" src="${a.url}" alt="attachment" loading="lazy" />`;
    } else {
      const cleanUrl = a.url.replace('/fl_inline/', '/');
      return `<a class="post-pdf-chip" href="${cleanUrl}" target="_blank" rel="noopener">
        📄 ${a.filename || 'PDF Document'}
      </a>`;
    }
  }).join('');
  return `<div class="post-attachments">${items}</div>`;
}

function openLightbox(src) {
  const box = document.createElement('div');
  box.className = 'qa-lightbox';
  box.innerHTML = `
    <button class="qa-lightbox-close">✕</button>
    <img src="${src}" alt="full image" />
  `;
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.classList.contains('qa-lightbox-close')) box.remove();
  });
  document.body.appendChild(box);
}

// ── Trending ─────────────────────────────────────────────────────────────────

function renderTrending(container, posts) {
  const subjectCounts = {};
  posts.forEach(p => { if (p.subject) subjectCounts[p.subject] = (subjectCounts[p.subject] || 0) + 1; });
  const sorted = Object.entries(subjectCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
  if (sorted.length === 0) {
    container.innerHTML = '<div class="text-muted text-body-sm" style="text-align:center">No trending topics yet</div>';
    return;
  }
  container.innerHTML = sorted.map(([subject, count]) => `
    <div class="flex items-center justify-between" style="padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);background:var(--color-surface-container-high)">
      <span class="text-body-sm" style="font-weight:600">${subject}</span>
      <span class="badge badge-primary">${count}</span>
    </div>
  `).join('');
}

// ── Filters ───────────────────────────────────────────────────────────────────

function setupFilters(main) {
  let searchTimeout;
  main.querySelector('#qa-search').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderPosts(main.querySelector('#posts-list'), window._allPosts || [], main);
    }, 300);
  });

  main.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter.type = btn.dataset.type;
      renderPosts(main.querySelector('#posts-list'), window._allPosts || [], main);
    });
  });
}

// ── Post form submit ──────────────────────────────────────────────────────────

function setupPostForm(main) {
  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn    = document.getElementById('post-submit-btn');
    const progressWrap = document.getElementById('progress-wrap');
    const progressFill = document.getElementById('progress-fill');
    const statusText   = document.getElementById('upload-status');

    const user     = appState.userData;
    const title    = document.getElementById('post-title').value.trim();
    const content  = document.getElementById('post-content').value.trim();
    const subject  = document.getElementById('post-subject').value.trim();
    const type     = document.querySelector('input[name="post-type"]:checked').value;

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Posting…';

    try {
      // ── Upload attachments if any ──────────────────────────────────────────
      let attachments = [];

      if (pendingFiles.length > 0) {
        progressWrap.style.display = 'block';
        statusText.style.display   = 'block';

        for (let i = 0; i < pendingFiles.length; i++) {
          const item = pendingFiles[i];
          statusText.textContent = `Uploading ${i + 1} of ${pendingFiles.length}…`;

          const result = await uploadToCloudinary(item.file, {
            folder: 'qa-attachments',
            onProgress: (pct) => {
              const overall = ((i + pct / 100) / pendingFiles.length) * 100;
              progressFill.style.width = overall + '%';
            }
          });
          attachments.push(result);
        }

        progressFill.style.width = '100%';
        statusText.textContent   = 'Upload complete!';
        setTimeout(() => {
          progressWrap.style.display = 'none';
          statusText.style.display   = 'none';
        }, 1200);
      }

      if (window._editingPostId) {
        // ── Update existing post ───────────────────────────────────────────────
        const postToEdit = (window._allPosts||[]).find(p => p.id === window._editingPostId);
        let finalAttachments = postToEdit?.attachments || [];
        if (attachments.length > 0) finalAttachments = [...finalAttachments, ...attachments];

        const updatedFields = {
          title, content, subject, type,
          attachments: finalAttachments
        };
        await updateDoc(doc(db, 'posts', window._editingPostId), updatedFields);

        if (postToEdit) Object.assign(postToEdit, updatedFields);
        
        if (window.cancelEdit) window.cancelEdit();
        showToast('Post updated! 📝', 'success');

      } else {
        // ── Save new to Firestore ──────────────────────────────────────────────
        const newPost = {
          title, content, subject, type,
          authorName:     user?.name || 'Aravind P',
          authorId:       appState.currentUser?.uid,
          registerNumber: user?.registerNumber || '212224240015',
          votes: 0, pinned: false,
          attachments,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'posts'), newPost);
        if (!window._allPosts) window._allPosts = [];
        window._allPosts.unshift({ id: docRef.id, ...newPost, createdAt: new Date() });
        
        // Reset form
        e.target.reset();
        pendingFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
        pendingFiles = [];
        document.getElementById('attach-preview').innerHTML = '';
        showToast('Post published! 🎉', 'success');
        if (window._closePostModal) window._closePostModal();
      }

      renderPosts(main.querySelector('#posts-list'), window._allPosts, main);
      if (window._editingPostId && window._closePostModal) window._closePostModal();

    } catch (err) {
      showToast('Failed to post: ' + err.message, 'error');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = '🚀 Post';
    }
  });
}

// ── Admin moderation ──────────────────────────────────────────────────────────

window.moderatePost = async function(id, action) {
  try {
    if (action === 'delete') {
      if (!confirm('Delete this post?')) return;
      await deleteDoc(doc(db, 'posts', id));
      window._allPosts = (window._allPosts||[]).filter(p => p.id !== id);
      document.getElementById('post-' + id)?.remove();
      showToast('Post deleted', 'success');
    } else if (action === 'pin') {
      const post = (window._allPosts||[]).find(p => p.id === id);
      const newPinned = !post?.pinned;
      await updateDoc(doc(db, 'posts', id), { pinned: newPinned });
      if (post) post.pinned = newPinned;
      showToast(newPinned ? 'Post pinned! 📌' : 'Post unpinned', 'success');
    }
  } catch (err) {
    showToast('Action failed: ' + err.message, 'error');
  }
};

window.editPost = function(id) {
  const post = (window._allPosts||[]).find(p => p.id === id);
  if (!post) return;
  window._editingPostId = id;
  
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-content').value = post.content || '';
  document.getElementById('post-subject').value = post.subject || '';
  const typeRadio = document.querySelector(`input[name="post-type"][value="${post.type}"]`);
  if (typeRadio) typeRadio.checked = true;

  const submitBtn = document.getElementById('post-submit-btn');
  submitBtn.innerHTML = '📝 Update Post';
  
  if (window._openPostModal) window._openPostModal();
};

window.cancelEdit = function() {
  window._editingPostId = null;
  const form = document.getElementById('post-form');
  if (form) form.reset();
  
  const submitBtn = document.getElementById('post-submit-btn');
  if (submitBtn) submitBtn.innerHTML = '🚀 Post';
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeAgo(date) {
  if (!date) return '';
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
