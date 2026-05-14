import { createLayout } from '../../components/sidebar.js';
import { appState, showToast } from '../../main.js';
import {
  db, collection, query, where, getDocs, addDoc,
  updateDoc, deleteDoc, doc, increment, serverTimestamp
} from '/src/firebase.js';

let currentFilter = { type: 'all', subject: '', semester: '' };

export function render(root) {
  const layout = createLayout('Knowledge Exchange', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">💬 Exam Q&A Board</h1>

    </div>

    <div class="grid gap-6" style="grid-template-columns:1fr 340px;align-items:start">

      <!-- Left: Feed -->
      <div>
        <!-- Filters -->
        <div class="flex gap-3 flex-wrap mb-4 items-center">
          <div class="search-bar" style="max-width:280px">
            <span class="search-icon">🔍</span>
            <input type="text" id="qa-search" placeholder="Search posts..." />
          </div>
          <div class="flex gap-2 flex-wrap" id="type-filters">
            <button class="chip active" data-type="all">All</button>
            <button class="chip" data-type="question">❓ Questions</button>
            <button class="chip" data-type="tip">💡 Tips</button>
            <button class="chip" data-type="answer">✅ Answer Keys</button>
          </div>
          <select class="form-select" id="sem-filter" style="width:130px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
            <option value="">All Sems</option>
            ${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}
          </select>
        </div>

        <!-- Posts List -->
        <div id="posts-list" class="flex flex-col gap-4">
          <div class="skeleton" style="height:140px;border-radius:var(--radius-xl)"></div>
          <div class="skeleton" style="height:140px;border-radius:var(--radius-xl)"></div>
          <div class="skeleton" style="height:140px;border-radius:var(--radius-xl)"></div>
        </div>
      </div>

      <!-- Right: Post form + Trending -->
      <div class="flex flex-col gap-4" style="position:sticky;top:80px">
        <div class="glass-card">
          <h3 class="text-title mb-4">✏️ Post Something</h3>
          <form id="post-form" class="flex flex-col gap-3">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="post-title" type="text" placeholder="What's your question or tip?" required />
            </div>
            <div class="form-group">
              <label class="form-label">Content</label>
              <textarea class="form-textarea" id="post-content" placeholder="Write your detailed post here..." required rows="4"></textarea>
            </div>
            <div class="grid grid-2 gap-3">
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input class="form-input" id="post-subject" type="text" placeholder="Subject name" required />
              </div>
              <div class="form-group">
                <label class="form-label">Semester</label>
                <select class="form-select" id="post-sem">
                  ${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">Semester ${s}</option>`).join('')}
                </select>
              </div>
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
            <button type="submit" class="btn btn-primary w-full">🚀 Post</button>
          </form>
        </div>

        <div class="glass-card">
          <h3 class="text-title mb-4">🔥 Trending Topics</h3>
          <div id="trending-list" class="flex flex-col gap-2">
            <div class="text-muted text-body-sm" style="text-align:center">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadPosts(main);
  setupFilters(main);
  setupPostForm(main);
}

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
  const semester = currentFilter.semester;

  let filtered = posts.filter(p => {
    const matchSearch   = !search || p.title?.toLowerCase().includes(search) || p.content?.toLowerCase().includes(search);
    const matchType     = type === 'all' || p.type === type;
    const matchSemester = !semester || String(p.semester) === semester;
    return matchSearch && matchType && matchSemester;
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
  const badges = { question: ['badge-primary', '❓ Question'], tip: ['badge-secondary', '💡 Tip'], answer: ['badge-success', '✅ Answer Key'] };

  container.innerHTML = filtered.map(post => {
    const [badgeClass, badgeLabel] = badges[post.type] || ['badge-primary', 'Post'];
    const pinned  = post.pinned;
    const timeAgo = getTimeAgo(post.createdAt?.toDate?.() || new Date(post.createdAt));

    return `
      <div class="post-card ${pinned?'pinned':''}" id="post-${post.id}">
        <div class="flex items-start gap-3">
          <div class="user-avatar" style="width:40px;height:40px;flex-shrink:0;font-size:16px">
            ${(post.authorName||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span style="font-weight:700;font-size:var(--font-body-sm)">${post.authorName||'Anonymous'}</span>
              ${post.registerNumber?`<span class="badge badge-primary" style="font-size:10px">${post.registerNumber}</span>`:''}
              ${pinned?'<span class="badge badge-secondary">📌 Pinned</span>':''}
              <span class="badge ${badgeClass}" style="margin-left:auto">${badgeLabel}</span>
            </div>
            <h4 style="font-size:var(--font-body);font-weight:700;margin-bottom:var(--space-2)">${post.title}</h4>
            <p class="line-clamp-2 text-muted text-body-sm" style="line-height:1.5">${post.content}</p>

            <div class="flex items-center gap-4 mt-3 flex-wrap">
              <span class="badge badge-purple">📚 ${post.subject}</span>
              <span class="badge" style="background:var(--bg-secondary);color:var(--accent-primary)">Sem ${post.semester}</span>
              <span style="font-size:11px;color:var(--color-on-surface-variant);margin-left:auto">${timeAgo}</span>
              <button class="btn btn-ghost btn-sm upvote-btn" data-id="${post.id}" data-votes="${post.votes||0}" style="gap:4px;padding:4px 10px;border-radius:var(--radius-full);border:1px solid var(--border-color)">
                ▲ <span class="vote-count">${post.votes||0}</span>
              </button>
              ${isAdmin ? `
                <button class="btn btn-ghost btn-sm" onclick="moderatePost('${post.id}','pin')" title="Pin/Unpin">📌</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--color-danger)" onclick="moderatePost('${post.id}','delete')" title="Delete">🗑️</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Upvote handlers
  container.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id    = btn.dataset.id;
      const current = parseInt(btn.dataset.votes) || 0;
      try {
        await updateDoc(doc(db, 'posts', id), { votes: increment(1) });
        btn.dataset.votes = current + 1;
        btn.querySelector('.vote-count').textContent = current + 1;
        btn.style.color = 'var(--color-primary)';
      } catch { showToast('Failed to upvote', 'error'); }
    });
  });
}

function renderTrending(container, posts) {
  const subjectCounts = {};
  posts.forEach(p => {
    if (p.subject) subjectCounts[p.subject] = (subjectCounts[p.subject] || 0) + 1;
  });
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

function setupFilters(main) {
  let searchTimeout;
  main.querySelector('#qa-search').addEventListener('input', (e) => {
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

  main.querySelector('#sem-filter').addEventListener('change', (e) => {
    currentFilter.semester = e.target.value;
    renderPosts(main.querySelector('#posts-list'), window._allPosts || [], main);
  });
}

function setupPostForm(main) {
  main.querySelector('#post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = appState.userData;
    const title   = main.querySelector('#post-title').value.trim();
    const content = main.querySelector('#post-content').value.trim();
    const subject = main.querySelector('#post-subject').value.trim();
    const semester = parseInt(main.querySelector('#post-sem').value);
    const type    = main.querySelector('input[name="post-type"]:checked').value;

    try {
      const newPost = {
        title, content, subject, semester, type,
        authorName: user?.name || 'Anonymous',
        authorId:   appState.currentUser?.uid,
        registerNumber: user?.registerNumber || '',
        votes: 0, pinned: false,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'posts'), newPost);
      if (!window._allPosts) window._allPosts = [];
      window._allPosts.unshift({ id: docRef.id, ...newPost, createdAt: new Date() });
      renderPosts(main.querySelector('#posts-list'), window._allPosts, main);
      e.target.reset();
      showToast('Post published! 🎉', 'success');
    } catch (err) {
      showToast('Failed to post: ' + err.message, 'error');
    }
  });
}

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
