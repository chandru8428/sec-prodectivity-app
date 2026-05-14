import { createLayout } from '../../components/sidebar.js';
import { db, collection, getDocs, updateDoc, deleteDoc, doc, query } from '/src/firebase.js';
import { showToast } from '../../main.js';

export function render(root) {
  const layout = createLayout('Q&A Moderation', '', 'Admin');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title" style="background:var(--gradient-purple);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🛡️ Q&A Board Moderation</h1>
      <p class="page-subtitle">Review, approve, pin, or remove community posts. Maintain a safe and helpful knowledge base.</p>
    </div>

    <div class="flex gap-3 mb-6 flex-wrap">
      <button class="chip active" data-filter="all">All Posts</button>
      <button class="chip" data-filter="pinned">📌 Pinned</button>
      <button class="chip" data-filter="question">❓ Questions</button>
      <button class="chip" data-filter="tip">💡 Tips</button>
      <button class="chip" data-filter="answer">✅ Answer Keys</button>
      <div class="search-bar" style="margin-left:auto">
        <span class="search-icon">🔍</span>
        <input type="text" id="mod-search" placeholder="Search posts..." />
      </div>
    </div>

    <div id="posts-container" class="flex flex-col gap-4">
      <div class="skeleton" style="height:160px;border-radius:var(--radius-xl)"></div>
      <div class="skeleton" style="height:160px;border-radius:var(--radius-xl)"></div>
      <div class="skeleton" style="height:160px;border-radius:var(--radius-xl)"></div>
    </div>
  `;

  let allPosts = [];
  let currentFilter = 'all';
  let searchQ = '';

  async function load() {
    try {
      const snap = await getDocs(collection(db, 'posts'));
      allPosts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderPosts();
    } catch (err) {
      main.querySelector('#posts-container').innerHTML = `<div class="alert alert-danger"><span>⚠️</span><span>${err.message}</span></div>`;
    }
  }

  function renderPosts() {
    const container = main.querySelector('#posts-container');
    let filtered = allPosts.filter(p => {
      if (currentFilter === 'pinned') return p.pinned;
      if (currentFilter !== 'all') return p.type === currentFilter;
      return true;
    });
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(q) || p.subject?.toLowerCase().includes(q) || p.authorName?.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align:center;padding:var(--space-10)"><div style="font-size:48px;margin-bottom:16px">📭</div><h3 class="text-title">No posts found</h3></div>`;
      return;
    }

    const badges = { question: ['badge-primary', '❓ Question'], tip: ['badge-secondary', '💡 Tip'], answer: ['badge-success', '✅ Answer Key'] };
    container.innerHTML = filtered.map(post => {
      const [badgeClass, badgeLabel] = badges[post.type] || ['badge-primary', 'Post'];
      const timeAgo = getTimeAgo(post.createdAt?.toDate?.() || new Date(post.createdAt));
      return `
        <div class="glass-card ${post.pinned?'pinned':''}" id="mod-post-${post.id}">
          <div class="flex items-start gap-4">
            <div class="user-avatar" style="width:44px;height:44px;font-size:16px;flex-shrink:0">
              ${(post.authorName||'?')[0].toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <span style="font-weight:700;font-size:var(--font-body)">${post.authorName||'Anonymous'}</span>
                ${post.registerNumber?`<span class="badge badge-primary" style="font-size:10px">${post.registerNumber}</span>`:''}
                <span class="badge ${badgeClass}">${badgeLabel}</span>
                ${post.pinned?'<span class="badge badge-secondary">📌 Pinned</span>':''}
                <span style="font-size:11px;color:var(--color-on-surface-variant);margin-left:auto">${timeAgo}</span>
              </div>
              <h4 style="font-size:var(--font-body);font-weight:700;margin-bottom:var(--space-2)">${post.title}</h4>
              <p class="text-muted text-body-sm" style="line-height:1.6;margin-bottom:var(--space-3)">${post.content}</p>
              <div class="flex items-center gap-3 flex-wrap">
                <span class="badge badge-purple">📚 ${post.subject}</span>
                <span class="badge" style="background:var(--primary-container);color:var(--accent-primary)">Sem ${post.semester}</span>
                <span style="font-size:11px;color:var(--color-on-surface-variant)">▲ ${post.votes||0} votes</span>
              </div>
            </div>
          </div>

          <!-- Moderation Actions -->
          <div class="flex gap-2 mt-4 pt-4" style="border-top:1px solid var(--border-color)">
            <button class="btn btn-success btn-sm" onclick="pinPost('${post.id}', ${!post.pinned})">
              ${post.pinned ? '📌 Unpin' : '📌 Pin'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deletePost('${post.id}')">🗑️ Remove</button>
            <span style="margin-left:auto;font-size:11px;color:var(--color-on-surface-variant);align-self:center">
              ID: ${post.id.slice(0,8)}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter buttons
  main.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderPosts();
    });
  });

  // Search
  let st;
  main.querySelector('#mod-search').addEventListener('input', (e) => {
    clearTimeout(st);
    st = setTimeout(() => { searchQ = e.target.value.trim(); renderPosts(); }, 300);
  });

  window.pinPost = async function(id, pinned) {
    try {
      await updateDoc(doc(db, 'posts', id), { pinned });
      const post = allPosts.find(p => p.id === id);
      if (post) post.pinned = pinned;
      renderPosts();
      showToast(pinned ? 'Post pinned! 📌' : 'Post unpinned', 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  };

  window.deletePost = async function(id) {
    if (!confirm('Permanently delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
      allPosts = allPosts.filter(p => p.id !== id);
      renderPosts();
      showToast('Post removed', 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  };

  load();
}

function getTimeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
