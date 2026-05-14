/**
 * Tool 4: Exam Q&A Board — Community Knowledge Base
 */
import { timeAgo, escapeHtml, generateId } from '../utils/helpers.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const demoPosts = [
  { id: '1', type: 'question', title: 'How to solve Laplace transforms for boundary value problems?', content: 'I am struggling with the Laplace transform methods in Unit 3. Can someone explain the step-by-step approach for solving boundary value problems using Laplace transforms? Specifically, the ones involving partial differential equations.', subject: 'Mathematics IV', semester: 6, authorName: 'Arun Kumar', votes: 12, createdAt: '2026-04-14T10:30:00Z', replies: 3 },
  { id: '2', type: 'tip', title: 'Pro tip: Use mnemonic for OSI layers', content: "Remember 'All People Seem To Need Data Processing' for the 7 OSI layers: Application, Presentation, Session, Transport, Network, Data Link, Physical. This saved me in the networks exam!", subject: 'Computer Networks', semester: 6, authorName: 'Priya M', votes: 24, createdAt: '2026-04-13T14:20:00Z', replies: 5 },
  { id: '3', type: 'question', title: 'What is the difference between mutex and semaphore?', content: 'Can someone explain the key differences between mutex and semaphore in Operating Systems? The textbook explanation is confusing. Looking for a simple practical example.', subject: 'Operating Systems', semester: 6, authorName: 'Vikram S', votes: 18, createdAt: '2026-04-12T09:15:00Z', replies: 7 },
  { id: '4', type: 'answer', title: 'Solution: BCNF normalization steps for DBMS', content: 'Here is the step-by-step approach for BCNF normalization:\n1. Find all candidate keys\n2. Identify functional dependencies\n3. Check if every determinant is a candidate key\n4. If not, decompose the relation\nThis was asked in last years exam.', subject: 'Database Management', semester: 6, authorName: 'Lakshmi R', votes: 31, createdAt: '2026-04-11T16:45:00Z', replies: 4 },
  { id: '5', type: 'question', title: 'Best resources for studying Compiler Design phases?', content: 'The upcoming Compiler Design exam covers all phases from lexical analysis to code generation. What are the best YouTube channels or notes for quick revision?', subject: 'Compiler Design', semester: 6, authorName: 'Deepak J', votes: 8, createdAt: '2026-04-10T11:00:00Z', replies: 6 },
  { id: '6', type: 'tip', title: 'Environmental Science - Important topics for end sem', content: "Based on previous years' papers, focus on: 1) Environmental Impact Assessment, 2) Air and Water pollution control measures, 3) Biodiversity and its conservation, 4) Sustainable development goals. These consistently appear as long questions.", subject: 'Environmental Science', semester: 6, authorName: 'Sneha K', votes: 45, createdAt: '2026-04-09T08:30:00Z', replies: 12 },
];

const subjects = ['All Subjects', 'Mathematics IV', 'Operating Systems', 'Computer Networks', 'Database Management', 'Software Engineering', 'Compiler Design', 'Environmental Science'];

export default async function renderQnABoard(container) {
  let posts = [...demoPosts];
  let filterType = '';
  let filterSubject = '';
  let searchQuery = '';
  let sortBy = 'createdAt';

  function getPostTypeBadge(type) {
    const map = {
      question: { class: 'badge-info', icon: '❓', label: 'Question' },
      answer: { class: 'badge-success', icon: '✅', label: 'Answer' },
      tip: { class: 'badge-warning', icon: '💡', label: 'Tip' },
    };
    return map[type] || map.question;
  }

  function getFilteredPosts() {
    let filtered = [...posts];
    if (filterType) filtered = filtered.filter(p => p.type === filterType);
    if (filterSubject && filterSubject !== 'All Subjects') filtered = filtered.filter(p => p.subject === filterSubject);
    if (searchQuery) filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery) || p.content.toLowerCase().includes(searchQuery));
    if (sortBy === 'votes') filtered.sort((a, b) => b.votes - a.votes);
    else filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
  }

  function render() {
    const filtered = getFilteredPosts();

    // Trending topics
    const topicCounts = {};
    posts.forEach(p => { topicCounts[p.subject] = (topicCounts[p.subject] || 0) + p.votes; });
    const trending = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    container.innerHTML = `
      <div class="animate-fade">
        <div class="page-header">
          <h1>Exam Q&A Board</h1>
          <p class="subtitle">Community knowledge base — Ask questions, share answers, post tips</p>
        </div>

        <!-- Filters -->
        <div class="qna-filters">
          <div class="search-input" style="flex:1; min-width:250px;">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="qna-search" placeholder="Search questions, answers, tips..." value="${searchQuery}" />
          </div>
          <div class="select-wrapper" style="width:180px;">
            <select id="subject-filter">
              ${subjects.map(s => `<option value="${s}" ${filterSubject === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="chip ${!filterType ? 'active' : ''}" data-type="">All</button>
            <button class="chip ${filterType === 'question' ? 'active' : ''}" data-type="question">❓ Questions</button>
            <button class="chip ${filterType === 'answer' ? 'active' : ''}" data-type="answer">✅ Answers</button>
            <button class="chip ${filterType === 'tip' ? 'active' : ''}" data-type="tip">💡 Tips</button>
          </div>
          <div class="tabs" style="margin-left:auto;">
            <button class="tab ${sortBy === 'createdAt' ? 'active' : ''}" data-sort="createdAt">Recent</button>
            <button class="tab ${sortBy === 'votes' ? 'active' : ''}" data-sort="votes">Top</button>
          </div>
        </div>

        <div class="qna-layout">
          <!-- Posts -->
          <div>
            <div class="post-list stagger-children">
              ${filtered.map(post => {
                const badge = getPostTypeBadge(post.type);
                const initials = post.authorName.split(' ').map(n => n[0]).join('');
                return `
                  <div class="post-card" data-id="${post.id}">
                    <div class="post-card-header">
                      <span class="badge ${badge.class}">${badge.icon} ${badge.label}</span>
                      <span class="post-meta">${timeAgo(post.createdAt)}</span>
                    </div>
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.content)}</p>
                    <div class="post-tags">
                      <span class="badge badge-neutral">${post.subject}</span>
                      <span class="badge badge-neutral">Sem ${post.semester}</span>
                    </div>
                    <div class="post-footer">
                      <div class="vote-controls">
                        <button class="vote-btn upvote-btn" data-id="${post.id}">▲</button>
                        <span class="vote-count">${post.votes}</span>
                        <button class="vote-btn downvote-btn" data-id="${post.id}">▼</button>
                      </div>
                      <span style="font-size:var(--text-label); color:var(--outline);">💬 ${post.replies} replies</span>
                      <div class="post-author">
                        <div class="avatar">${initials}</div>
                        <span>${post.authorName}</span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
              ${filtered.length === 0 ? `
                <div class="empty-state">
                  <div class="empty-icon">🔍</div>
                  <h3>No posts found</h3>
                  <p>Try adjusting your filters or be the first to post!</p>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Trending Sidebar -->
          <div class="trending-sidebar">
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">🔥 Trending Topics</h3>
              ${trending.map(([topic, count]) => `
                <div class="trending-topic">
                  <div class="topic-name">${topic}</div>
                  <div class="topic-count">${count} votes</div>
                </div>
              `).join('')}
            </div>
            <div class="glass-card-static">
              <h3 class="section-title" style="margin-bottom:var(--space-md);">📊 Stats</h3>
              <div style="font-size:var(--text-body-sm); color:var(--on-surface-variant); display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between;"><span>Total Posts</span><strong style="color:var(--on-surface);">${posts.length}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Questions</span><strong style="color:var(--info);">${posts.filter(p => p.type === 'question').length}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Tips</span><strong style="color:var(--warning);">${posts.filter(p => p.type === 'tip').length}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Answers</span><strong style="color:var(--success);">${posts.filter(p => p.type === 'answer').length}</strong></div>
              </div>
            </div>
          </div>
        </div>

        <!-- FAB -->
        <button class="fab" id="new-post-fab" title="New Post">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        </button>
      </div>
    `;

    setupEvents();
  }

  function setupEvents() {
    // Search
    document.getElementById('qna-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });

    // Subject filter
    document.getElementById('subject-filter')?.addEventListener('change', (e) => {
      filterSubject = e.target.value;
      render();
    });

    // Type chips
    container.querySelectorAll('.chip[data-type]').forEach(chip => {
      chip.addEventListener('click', () => {
        filterType = chip.dataset.type;
        render();
      });
    });

    // Sort tabs
    container.querySelectorAll('.tab[data-sort]').forEach(tab => {
      tab.addEventListener('click', () => {
        sortBy = tab.dataset.sort;
        render();
      });
    });

    // Upvote
    container.querySelectorAll('.upvote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const post = posts.find(p => p.id === btn.dataset.id);
        if (post) { post.votes++; render(); }
      });
    });

    // Downvote
    container.querySelectorAll('.downvote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const post = posts.find(p => p.id === btn.dataset.id);
        if (post && post.votes > 0) { post.votes--; render(); }
      });
    });

    // New Post FAB
    document.getElementById('new-post-fab')?.addEventListener('click', () => {
      showModal({
        title: 'Create New Post',
        content: `
          <div class="form-group" style="margin-bottom:16px;">
            <label>Post Type</label>
            <div class="role-toggle" style="margin-top:4px;">
              <button type="button" class="role-option active" data-ptype="question">❓ Question</button>
              <button type="button" class="role-option" data-ptype="answer">✅ Answer</button>
              <button type="button" class="role-option" data-ptype="tip">💡 Tip</button>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Title</label>
            <input type="text" id="new-post-title" placeholder="Enter a clear, specific title..." />
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label>Content</label>
            <textarea id="new-post-content" placeholder="Describe your question or share your knowledge..." style="min-height:120px;"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Subject</label>
              <div class="select-wrapper">
                <select id="new-post-subject">
                  ${subjects.filter(s => s !== 'All Subjects').map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="submit-post-btn">Post</button>
        `,
        size: 'lg',
      });

      // Post type toggle
      document.querySelectorAll('.role-option[data-ptype]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.role-option[data-ptype]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Submit
      document.getElementById('submit-post-btn')?.addEventListener('click', () => {
        const title = document.getElementById('new-post-title')?.value;
        const content = document.getElementById('new-post-content')?.value;
        const subject = document.getElementById('new-post-subject')?.value;
        const type = document.querySelector('.role-option[data-ptype].active')?.dataset.ptype || 'question';

        if (!title || !content) {
          showToast('Please fill in all fields', 'warning');
          return;
        }

        posts.unshift({
          id: generateId(),
          type, title, content, subject,
          semester: 6,
          authorName: window.__currentUser?.displayName || 'Anonymous',
          votes: 0,
          createdAt: new Date().toISOString(),
          replies: 0,
        });

        document.querySelector('.modal-backdrop')?.remove();
        showToast('Post created successfully!', 'success');
        render();
      });

      document.querySelector('.modal-cancel-btn')?.addEventListener('click', () => {
        document.querySelector('.modal-backdrop')?.remove();
      });
    });
  }

  render();
}
