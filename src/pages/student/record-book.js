import { createLayout } from '../../components/sidebar.js';
import { appState, showToast } from '../../main.js';
import { db, collection, query, where, getDocs } from '/src/supabase-adapter.js';
import { getUserRepos, matchExperimentsToRepos, stringSimilarity } from '../../services/github-service.js';
import QRCode from 'qrcode';

// Module-level experiment list (survives re-renders inside the page)
let experiments = [];
let _username = '';

const RB_KEYS = ['rb_username','rb_subjectName','rb_subjectCode','rb_experiments'];

function saveExperiments() {
  try { localStorage.setItem('rb_experiments', JSON.stringify(experiments)); } catch {}
}
function loadExperiments() {
  try {
    const raw = localStorage.getItem('rb_experiments');
    experiments = raw ? JSON.parse(raw) : [];
  } catch { experiments = []; }
}
function clearRBStorage() {
  RB_KEYS.forEach(k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} });
  // legacy sessionStorage keys
  ['rb_username','rb_subject','rb_code'].forEach(k => { try { sessionStorage.removeItem(k); } catch {}; });
}

export function render(root) {
  loadExperiments();
  _username = localStorage.getItem('rb_username') || sessionStorage.getItem('rb_username') || '';

  const layout = createLayout('Record Book Forge', '', 'Student');
  root.appendChild(layout);
  const main = layout.querySelector('#page-main');

  main.innerHTML = `
    <style>
      /* ── Two-column layout: responsive ── */
      #rb-main-grid {
        display: grid;
        grid-template-columns: 380px 1fr;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 860px) {
        #rb-main-grid {
          grid-template-columns: 1fr;
        }
      }

      /* ── Editor card header: action buttons ── */
      #editor-action-btns {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      @media (max-width: 640px) {
        #editor-action-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
        }
        #editor-action-btns .btn {
          justify-content: center;
          width: 100%;
        }
        #download-pdf-btn {
          grid-column: 1 / -1;
        }
      }

      /* ── Editable table wrapper ── */
      #exp-table-wrap {
        background: #ffffff;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        overflow: hidden;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      #exp-editor { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 14px; 
        min-width: 700px;
      }

      /* ── Mobile card list (replaces table on small screens) ── */
      #exp-cards { display: none; }

      @media (max-width: 640px) {
        #exp-table-wrap { display: none; }
        #exp-cards { display: flex; flex-direction: column; gap: 12px; }

        .exp-card {
          background: #fff;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .exp-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .exp-card-header .index-wrapper {
          width: 40px;
          flex-shrink: 0;
        }
        .exp-card-header input.exp-no {
          font-size: 14px;
          padding: 6px 0 !important;
        }
        .exp-card-title { font-weight: 700; font-size: 14px; color: #4c1d95; flex: 1; }
        .exp-card-field { display: flex; flex-direction: column; gap: 4px; }
        .exp-card-label { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #9ca3af; }
        .exp-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px dashed rgba(0,0,0,0.07); }
        .exp-card-status { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .exp-card-status.live { color: #16a34a; }
        .exp-card-status.missing { color: #ef4444; }
      }

      /* Header Styles */
      #exp-editor thead tr {
        background: var(--bg-secondary);
      }
      #exp-editor th {
        color: var(--color-on-surface);
        padding: 16px 10px;
        text-align: center;
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
        border-bottom: 2px solid var(--border-color);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      #exp-editor th:last-child { border-right: none; }

      #exp-editor td {
        padding: 8px 6px;
        vertical-align: middle;
        border: none;
        background: #ffffff;
        border-bottom: 1px dashed rgba(0,0,0,0.05);
      }

      /* Inputs inside cells */
      #exp-editor input[type="text"],
      #exp-editor input[type="date"],
      .exp-card input[type="text"],
      .exp-card input[type="date"] {
        width: 100%;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 13.5px;
        font-weight: 600;
        outline: none;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      @media (max-width: 640px) {
        .exp-card input[type="text"],
        .exp-card input[type="date"] {
          padding: 12px 14px;
          font-size: 14px;
          border-radius: 10px;
        }
      }

      /* Date Input (Blue tint) */
      #exp-editor input.exp-date,
      .exp-card input.exp-date {
        background: #eff6ff;
        color: #1e3a8a;
        border: 1px solid #bfdbfe;
        color-scheme: light;
      }
      input.exp-date:focus {
        background: #dbeafe;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        border-color: #3b82f6;
      }

      /* Title Input (Purple tint) */
      #exp-editor input.exp-title,
      .exp-card input.exp-title {
        background: #f5f3ff;
        color: #4c1d95;
        border: 1px solid #ddd6fe;
      }
      input.exp-title:focus {
        background: #ede9fe;
        box-shadow: 0 0 0 3px rgba(139,92,246,0.2);
        border-color: #8b5cf6;
      }

      /* URL Input (Pink tint) */
      #exp-editor input.exp-url,
      .exp-card input.exp-url {
        background: #fdf2f8;
        color: #831843;
        border: 1px solid #fbcfe8;
      }
      input.exp-url:focus {
        background: #fce7f3;
        box-shadow: 0 0 0 3px rgba(236,72,153,0.2);
        border-color: #ec4899;
      }

      /* Input hover effect */
      #exp-editor input[type="text"]:hover:not(:focus),
      #exp-editor input[type="date"]:hover:not(:focus) {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }

      #exp-editor input::placeholder,
      .exp-card input::placeholder { color: rgba(0,0,0,0.3); font-weight: 500; }

      /* Form Input Wrapper fixes */
      .form-input-wrapper { position: relative; display: flex; align-items: center; }
      .form-input-wrapper .icon-left { position: absolute; left: 12px; color: #6b7280; font-weight: 600; font-size: 15px; pointer-events: none; z-index: 10; }
      .form-input-wrapper input { padding-left: 36px !important; }

      /* The # column wrapper */
      .index-wrapper {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        padding: 4px;
        border-radius: 8px;
        display: flex;
        box-shadow: 0 2px 8px rgba(99,102,241,0.2);
      }
      .index-wrapper input {
        background: rgba(255,255,255,0.2) !important;
        color: #ffffff !important;
        font-weight: 800;
        text-align: center;
        padding: 8px 0 !important;
        border-radius: 6px !important;
        border: none !important;
        box-shadow: none !important;
      }

      .url-input { color: #db2777 !important; }

      .del-row-btn {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #ef4444; 
        cursor: pointer;
        font-size: 15px; 
        min-width: 36px;
        min-height: 36px;
        width: 36px;
        height: 36px;
        transition: all 0.2s;
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .del-row-btn:hover { 
        background: #fee2e2;
        transform: scale(1.1); 
        border-color: #f87171;
      }

      /* ── PDF preview modal ── */
      #pdf-modal { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.75); align-items:center; justify-content:center; padding: 16px; box-sizing:border-box; }
      #pdf-modal.open { display:flex; }
      #pdf-modal-inner { background:#fff; border-radius:12px; width:100%; max-width:960px; height:90vh; display:flex; flex-direction:column; overflow:hidden; }
      #pdf-modal-bar {
        display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;
        padding:12px 16px;
        background: linear-gradient(90deg,#6366f1,#8b5cf6);
        color:#fff;
      }
      #pdf-modal-bar span { font-weight:700; font-size:15px; }
      #pdf-modal-bar button { background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.4); color:#fff; border-radius:7px; padding:7px 16px; cursor:pointer; font-size:13px; font-weight:600; }
      #pdf-modal-bar button:hover { background:rgba(255,255,255,0.35); }
      #pdf-iframe { flex:1; border:none; }

      @media (max-width: 640px) {
        #pdf-modal-inner { height: 85vh; border-radius: 10px; }
        #pdf-modal-bar { padding: 10px 12px; }
      }
    </style>

    <!-- PDF Preview Modal -->
    <div id="pdf-modal">
      <div id="pdf-modal-inner">
        <div id="pdf-modal-bar">
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            PDF Preview
          </div>
          <div style="display:flex;gap:8px;">
            <button id="modal-download-btn">📥 Download</button>
            <button id="modal-close-btn">✕ Close</button>
          </div>
        </div>
        <div id="pdf-fallback-msg" style="display:none; flex:1; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: 24px; color: var(--color-on-surface-variant);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px; opacity:0.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--color-on-surface); margin-bottom: 8px;">Preview Not Supported</h3>
          <p style="font-size: 14px; margin-bottom: 24px; max-width: 280px; line-height: 1.5;">Mobile browsers cannot preview PDFs directly inside the app. Please download the file to view it.</p>
          <button id="fallback-download-btn" class="btn btn-primary" style="padding: 12px 24px;">📥 Download PDF</button>
        </div>
        <div id="pdf-canvas-container" style="display:none; width:100%; height:100%; overflow:auto; background:var(--bg-body); padding:16px; flex-direction:column; align-items:center; gap:16px;"></div>
        <iframe id="pdf-iframe" title="PDF Preview"></iframe>
      </div>
    </div>

    <div id="rb-main-grid">

      <!-- Left Panel -->
      <div class="flex flex-col gap-5">

        <!-- Mode Selector -->
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button id="mode-auto" type="button" class="btn btn-secondary flex-1" style="border: 2px solid var(--accent-primary); background: var(--bg-surface-elevated)">⚡ Auto-Generate</button>
          <button id="mode-manual" type="button" class="btn btn-ghost flex-1">✍️ Manual Entry</button>
        </div>

        <!-- Details form -->
        <div class="glass-card">
          <div class="flex items-center gap-3 mb-4">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0">1</div>
            <h2 class="text-title">Student &amp; Repository Details</h2>
          </div>
          <form id="record-form" class="flex flex-col gap-4">
            <div class="form-group">
              <label class="form-label">Student Name</label>
              <input class="form-input" id="student-name" type="text" placeholder="e.g. John Doe" required
                value="${sessionStorage.getItem('rb_student_name') || appState.userData?.name || ''}" />
            </div>

            <div class="form-group">
              <label class="form-label">Register Number</label>
              <input class="form-input" id="register-number" type="text" placeholder="e.g. 211301110" required
                value="${sessionStorage.getItem('rb_reg_no') || appState.userData?.registerNumber || ''}" />
            </div>

            <div class="form-group" id="github-username-group">
              <label class="form-label">GitHub Username</label>
              <div class="form-input-wrapper">
                <span class="input-icon icon-left">@</span>
                <input class="form-input" id="gh-username" type="text" placeholder="e.g. student_github" required
                  value="${sessionStorage.getItem('rb_username') || ''}" />
              </div>
            </div>

            <!-- Auto-Generate Fields -->
            <div id="auto-fields" class="flex flex-col gap-4">
              <div class="form-group">
                <label class="form-label">Select Subject</label>
                <select class="form-input" id="auto-subject-select" required style="padding:10px 12px;border-radius:8px;font-weight:600;font-size:14px;background:#f8fafc;">
                  <option value="">Loading subjects...</option>
                </select>
              </div>
              <div id="custom-subject-fields" class="flex flex-col gap-4" style="display:none;">
                <div class="form-group">
                  <label class="form-label">Subject Name</label>
                  <input class="form-input" id="auto-custom-subject" type="text" placeholder="e.g. Machine Learning" />
                </div>
                <div class="form-group">
                  <label class="form-label">Subject Code (Optional)</label>
                  <input class="form-input" id="auto-custom-code" type="text" placeholder="e.g. CS101" />
                </div>
              </div>
            </div>

            <!-- Manual Fields -->
            <div id="manual-fields" class="flex flex-col gap-4" style="display:none;">
              <div class="form-group">
                <label class="form-label">Subject Name</label>
                <input class="form-input" id="manual-subject" type="text" placeholder="e.g. Subject Name" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject Code</label>
                <input class="form-input" id="manual-code" type="text" placeholder="e.g. SUB101" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" id="validate-btn">
              <span id="validate-text">🔍 Fetch &amp; Load Experiments</span>
              <span id="validate-spinner" class="spinner hidden" style="width:18px;height:18px;border-width:2px"></span>
            </button>
          </form>
        </div>

        <!-- Processing Steps -->
        <div class="glass-card" id="validation-card" style="display:none">
          <div class="flex items-center gap-3 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <h3 class="text-title">Processing Steps</h3>
          </div>
          <div class="flex flex-col gap-3">
            ${[['v1','Check GitHub Username'],['v2','Fetch Repositories'],['v3','Match Subject Mapping'],['v4','Verify &amp; Get Dates'],['v5','Load Editor']].map(([id,label],i) => `
              <div class="flex items-center gap-3">
                <div style="width:28px;height:28px;border-radius:50%;border:2px solid var(--color-outline-variant);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0" id="${id}-circle">${i+1}</div>
                <div>
                  <div style="font-weight:600;font-size:var(--font-body-sm)">${label}</div>
                  <div style="font-size:11px;color:var(--color-on-surface-variant)" id="${id}-msg">Waiting...</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

      </div>

      <!-- Right: Editable Experiment Table -->
      <div>
        <div id="editor-empty" class="glass-card" style="text-align:center;padding:var(--space-10) var(--space-6)">
          <div style="display:flex;justify-content:center;margin-bottom:16px;color:var(--color-outline)">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>
          </div>
          <h3 class="text-title" style="margin-bottom:6px">Your experiment table will appear here</h3>
          <p class="text-muted" style="font-size:13px;margin-bottom:var(--space-6)">Fill the form on the left and click <strong>Fetch &amp; Load Experiments</strong>.</p>

          <!-- How It Works steps -->
          <div style="text-align:left;display:flex;flex-direction:column;gap:12px;max-width:400px;margin:0 auto">
            <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--color-outline);margin-bottom:4px">How it works</div>

            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gradient-primary);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">1</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-on-surface)">Enter your GitHub username</div>
                <div style="font-size:12px;color:var(--color-on-surface-variant);margin-top:2px">We'll fetch your public repositories to auto-detect experiments.</div>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gradient-primary);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">2</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-on-surface)">Select your subject</div>
                <div style="font-size:12px;color:var(--color-on-surface-variant);margin-top:2px">Pick from admin-mapped subjects or choose "My subject is not listed" for AI matching.</div>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--gradient-primary);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">3</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-on-surface)">Edit &amp; download your PDF</div>
                <div style="font-size:12px;color:var(--color-on-surface-variant);margin-top:2px">Dates are auto-fetched from GitHub. Edit any cell, add rows, then download.</div>
              </div>
            </div>
          </div>
        </div>


        <div id="editor-card" class="glass-card" style="display:none">
          <div class="flex items-center justify-between mb-4" style="flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              <h3 class="text-title">Edit Experiments</h3>
            </div>
            <div id="editor-action-btns">
              <button class="btn btn-ghost btn-sm flex items-center gap-2" id="reset-btn" style="color:var(--color-danger);opacity:0.8">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Reset
              </button>
              <button class="btn btn-secondary btn-sm flex items-center gap-2" id="add-row-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Row
              </button>
              <button class="btn btn-secondary btn-sm flex items-center gap-2" id="preview-pdf-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Preview PDF
              </button>
              <button class="btn btn-primary btn-sm flex items-center gap-2" id="download-pdf-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download PDF
              </button>
            </div>
          </div>

          <div style="font-size:12px;color:var(--color-on-surface-variant);margin-bottom:12px;display:flex;gap:6px;align-items:flex-start">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:2px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <div>Dates are auto-fetched from GitHub. You can edit any cell directly. Add rows for missing experiments.</div>
          </div>

          <div id="exp-table-wrap">
            <table id="exp-editor">
              <thead>
                <tr>
                  <th style="width:50px">#</th>
                  <th style="width:140px">Date</th>
                  <th>Name of The Experiment</th>
                  <th style="width:200px">GitHub URL</th>
                  <th style="width:50px">Status</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody id="exp-tbody"></tbody>
            </table>
          </div>
          <!-- Mobile card list (shown below 640px instead of table) -->
          <div id="exp-cards"></div>

          <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);font-size:12px;font-style:italic;color:var(--color-on-surface-variant)">
            I confirm that the experiments and GitHub links provided are entirely my own work.
          </div>
        </div>
      </div>

    </div>
  `;

  // ── Mode selection & Subject logic ──
  let currentMode = 'auto';
  const autoBtn = main.querySelector('#mode-auto');
  const manualBtn = main.querySelector('#mode-manual');
  const autoFields = main.querySelector('#auto-fields');
  const manualFields = main.querySelector('#manual-fields');
  const customFields = main.querySelector('#custom-subject-fields');
  const subjectSelect = main.querySelector('#auto-subject-select');
  
  const manualSubjectInp = main.querySelector('#manual-subject');
  const manualCodeInp = main.querySelector('#manual-code');
  const autoCustomSubjInp = main.querySelector('#auto-custom-subject');
  const autoCustomCodeInp = main.querySelector('#auto-custom-code');
  const ghInput = main.querySelector('#gh-username');

  // Load subjects
  async function loadSubjects() {
    try {
      const snap = await getDocs(collection(db, 'repoMappings'));
      const subjectsMap = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.subjectName && data.subjectCode) {
          subjectsMap[data.subjectCode] = data.subjectName;
        }
      });
      subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
      for (const [code, name] of Object.entries(subjectsMap)) {
        const opt = document.createElement('option');
        opt.value = `${code}|${name}`;
        opt.textContent = `${name} (${code})`;
        subjectSelect.appendChild(opt);
      }
      const customOpt = document.createElement('option');
      customOpt.value = 'custom';
      customOpt.textContent = '🔍 My subject is not listed...';
      subjectSelect.appendChild(customOpt);
      
      const prevCode = sessionStorage.getItem('rb_code');
      const prevSubj = sessionStorage.getItem('rb_subject');
      if (prevCode && prevSubj) {
        const val = `${prevCode}|${prevSubj}`;
        if (Array.from(subjectSelect.options).some(o => o.value === val)) {
          subjectSelect.value = val;
        } else {
          subjectSelect.value = 'custom';
          customFields.style.display = 'flex';
          autoCustomSubjInp.value = prevSubj;
          autoCustomCodeInp.value = prevCode;
          autoCustomSubjInp.required = true;
        }
      }
    } catch(e) {
      subjectSelect.innerHTML = '<option value="custom">🔍 My subject is not listed...</option>';
      customFields.style.display = 'flex';
      autoCustomSubjInp.required = true;
    }
  }
  loadSubjects();

  autoBtn.addEventListener('click', () => {
    currentMode = 'auto';
    autoBtn.className = 'btn btn-secondary flex-1';
    autoBtn.style.border = '2px solid var(--accent-primary)';
    autoBtn.style.background = 'var(--bg-surface-elevated)';
    manualBtn.className = 'btn btn-ghost flex-1';
    manualBtn.style.border = '';
    manualBtn.style.background = '';
    autoFields.style.display = 'flex';
    manualFields.style.display = 'none';
    
    main.querySelector('#github-username-group').style.display = 'block';
    main.querySelector('#gh-username').required = true;
    
    subjectSelect.required = true;
    manualSubjectInp.required = false;
    manualCodeInp.required = false;
    if (subjectSelect.value === 'custom') autoCustomSubjInp.required = true;
    
    main.querySelector('#validate-text').innerHTML = '🔍 Fetch &amp; Load Experiments';
  });

  manualBtn.addEventListener('click', () => {
    currentMode = 'manual';
    manualBtn.className = 'btn btn-secondary flex-1';
    manualBtn.style.border = '2px solid var(--accent-primary)';
    manualBtn.style.background = 'var(--bg-surface-elevated)';
    autoBtn.className = 'btn btn-ghost flex-1';
    autoBtn.style.border = '';
    autoBtn.style.background = '';
    autoFields.style.display = 'none';
    manualFields.style.display = 'flex';
    
    main.querySelector('#github-username-group').style.display = 'none';
    main.querySelector('#gh-username').required = false;
    
    subjectSelect.required = false;
    autoCustomSubjInp.required = false;
    autoCustomCodeInp.required = false;
    manualSubjectInp.required = true;
    manualCodeInp.required = true;
    
    main.querySelector('#validate-text').innerHTML = '✍️ Start Manual Entry';
  });

  subjectSelect.addEventListener('change', () => {
    if (subjectSelect.value === 'custom') {
      customFields.style.display = 'flex';
      autoCustomSubjInp.required = true;
    } else {
      customFields.style.display = 'none';
      autoCustomSubjInp.required = false;
    }
  });

  // ── Restore previous session's experiment table if available ──
  if (experiments.length > 0) {
    main.querySelector('#editor-card').style.display = '';
    main.querySelector('#editor-empty').style.display = 'none';
    buildEditor(main, _username);
    showToast(`Restored ${experiments.length} experiment(s) from last session. ✅`, 'info', 3000);
  }

  // ── Form submit ──
  main.querySelector('#record-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentName = main.querySelector('#student-name').value.trim();
    const regNo = main.querySelector('#register-number').value.trim();
    let username = ghInput.value.trim().replace(/^@\s*/, '');
    ghInput.value = username; // Update input field visually
    let subject = '';
    let code = '';

    if (currentMode === 'auto') {
      if (subjectSelect.value === 'custom') {
        subject = autoCustomSubjInp.value.trim();
        code = autoCustomCodeInp.value.trim();
      } else {
        const parts = subjectSelect.value.split('|');
        code = parts[0];
        subject = parts[1];
      }
    } else {
      subject = manualSubjectInp.value.trim();
      code = manualCodeInp.value.trim();
    }

    sessionStorage.setItem('rb_student_name', studentName);
    localStorage.setItem('rb_student_name', studentName);
    sessionStorage.setItem('rb_reg_no', regNo);
    localStorage.setItem('rb_reg_no', regNo);
    sessionStorage.setItem('rb_username', username);
    localStorage.setItem('rb_username', username);
    sessionStorage.setItem('rb_subject',  subject);
    localStorage.setItem('rb_subjectName', subject);
    sessionStorage.setItem('rb_code',     code);
    localStorage.setItem('rb_subjectCode', code);

    if (currentMode === 'manual') {
      _username = username;
      // Pre-fill with 3 empty rows so the user has immediate inputs to type in
      experiments = Array.from({ length: 3 }).map((_, i) => ({
        expNo: String(i + 1).padStart(2, '0'),
        date: '',
        title: '',
        repoUrl: '',
        isLive: false,
        _manual: true
      }));
      localStorage.setItem('rb_experiments', JSON.stringify(experiments));
      main.querySelector('#validation-card').style.display = 'none';
      main.querySelector('#editor-card').style.display = '';
      main.querySelector('#editor-empty').style.display = 'none';
      buildEditor(main, _username);
      showToast('Manual mode activated! Add your experiments below.', 'success');
      return;
    }

    const btn  = main.querySelector('#validate-btn');
    const text = main.querySelector('#validate-text');
    const spin = main.querySelector('#validate-spinner');
    btn.disabled = true;
    text.classList.add('hidden');
    spin.classList.remove('hidden');
    main.querySelector('#validation-card').style.display = '';
    main.querySelector('#editor-card').style.display = 'none';
    main.querySelector('#editor-empty').style.display = '';

    try {
      await runPipeline(main, username, subject, code, subjectSelect.value === 'custom');
    } finally {
      btn.disabled = false;
      text.classList.remove('hidden');
      spin.classList.add('hidden');
    }
  });

  // ── Reset button ──
  main.querySelector('#reset-btn').addEventListener('click', () => {
    if(confirm('Are you sure you want to reset all experiments and start over?')) {
      experiments = [];
      localStorage.removeItem('rb_experiments');
      main.querySelector('#editor-card').style.display = 'none';
      main.querySelector('#editor-empty').style.display = '';
      main.querySelector('#exp-tbody').innerHTML = '';
    }
  });

  // ── Add row button ──
  main.querySelector('#add-row-btn').addEventListener('click', () => {
    const newExp = {
      expNo: String(experiments.length + 1).padStart(2, '0'),
      date: '',
      title: '',
      repoUrl: '',
      isLive: false,
      repoName: '',
      _manual: true,
    };
    experiments.push(newExp);
    saveExperiments();
    addEditorRow(main, newExp, experiments.length - 1);
  });

  // ── Preview PDF ──
  main.querySelector('#preview-pdf-btn').addEventListener('click', async () => {
    await openPDFPreview(main);
  });

  // ── Download PDF ──
  main.querySelector('#download-pdf-btn').addEventListener('click', async () => {
    await triggerDownload(main);
  });

  // ── Modal close ──
  main.querySelector('#modal-close-btn').addEventListener('click', () => {
    main.querySelector('#pdf-modal').classList.remove('open');
    const iframe = main.querySelector('#pdf-iframe');
    if (iframe._blobUrl) { URL.revokeObjectURL(iframe._blobUrl); iframe._blobUrl = null; }
    iframe.src = '';
  });

  main.querySelector('#modal-download-btn').addEventListener('click', async () => {
    await triggerDownload(main);
  });

  // Click outside modal to close
  main.querySelector('#pdf-modal').addEventListener('click', (e) => {
    if (e.target === main.querySelector('#pdf-modal')) {
      main.querySelector('#modal-close-btn').click();
    }
  });
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
//
// PLAN:
//  Step 1 — Validate the student's GitHub username exists
//  Step 2 — Fetch ALL of the student's public repos (once, as raw objects)
//  Step 3 — Load admin experiment-title mappings for the selected subject
//  Step 4 — For each experiment title, AI-fuzzy-match the best repo in the
//            student's list, then verify it's live via GitHub API
//  Step 5 — Build the editable table
//
async function runPipeline(main, username, subject, code, isCustom) {
  _username = username;

  const setStep = (id, status, msg) => {
    const circle = main.querySelector(`#${id}-circle`);
    const msgEl  = main.querySelector(`#${id}-msg`);
    if (status === 'loading') {
      circle.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px"></span>';
      circle.style.background = 'transparent';
      circle.style.color = 'inherit';
      circle.style.border = '2px solid var(--color-primary)';
      circle.style.boxShadow = 'none';
    } else if (status === 'done') {
      circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      circle.style.background = 'var(--gradient-primary, #6366f1)';
      circle.style.color = '#fff';
      circle.style.border = '2px solid transparent';
      circle.style.boxShadow = '0 2px 8px rgba(99,102,241,0.4)';
    } else if (status === 'error') {
      circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      circle.style.background = 'var(--color-danger, #ef4444)';
      circle.style.color = '#fff';
      circle.style.border = '2px solid transparent';
      circle.style.boxShadow = '0 2px 8px rgba(239,68,68,0.4)';
    }
    if (msgEl) msgEl.textContent = msg;
  };

  // ── Step 1: Validate GitHub username ────────────────────────────────────
  setStep('v1', 'loading', 'Checking GitHub username...');
  try {
    const r = await fetch(`https://api.github.com/users/${username}`);
    if (r.status === 403 || r.status === 429) {
      setStep('v1', 'done', `✓ (Rate Limited) ${username}`);
    } else if (!r.ok) {
      throw new Error('not found');
    } else {
      setStep('v1', 'done', `✓ Found: ${username}`);
    }
  } catch {
    setStep('v1', 'error', `User "${username}" not found on GitHub`);
    showToast('GitHub username not found. Check spelling and try again.', 'error');
    return;
  }

  // ── Step 2: Fetch all student repos ─────────────────────────────────────
  setStep('v2', 'loading', 'Fetching your repositories...');
  let userRepos = [];
  try {
    userRepos = await getUserRepos(username);
    if (!userRepos.length) throw new Error('no public repos');
    setStep('v2', 'done', `✓ Found ${userRepos.length} public repositories`);
  } catch (err) {
    setStep('v2', 'error', 'Cannot fetch repositories — ' + err.message);
    showToast('Failed to fetch your GitHub repositories.', 'error');
    return;
  }

  // ── Step 3: Load admin experiment-title mappings ─────────────────────────
  setStep('v3', 'loading', isCustom ? 'Scanning your repos for subject matches...' : 'Loading experiment list from admin mapping...');
  let mappings = [];
  try {
    if (isCustom) {
      // Custom mode — no admin mapping; scan student's repos directly by subject keywords
      const subjectWords = subject
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

      let expCount = 1;
      userRepos.forEach(repo => {
        const target = `${repo.name} ${repo.description || ''}`.toLowerCase();
        const kwHits  = subjectWords.filter(w => target.includes(w)).length;
        const simScore = stringSimilarity(subject, repo.name);
        if (kwHits > 0 || simScore > 0.3) {
          mappings.push({
            expNo:   String(expCount).padStart(2, '0'),
            title:   repo.description || repo.name.replace(/[-_]/g, ' '),
            repoUrl: repo.html_url,
            date:    repo.created_at
              ? new Date(repo.created_at)
                  .toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' })
                  .replace(/\//g, '/')
              : '',
            _directRepo: repo,  // already resolved — skip AI matching in step 4
          });
          expCount++;
        }
      });

      if (!mappings.length) {
        setStep('v3', 'error', `No repos found matching "${subject}"`);
        showToast(`No repositories related to "${subject}" found. Try manual mode.`, 'warning', 5000);
        return;
      }
    } else {
      // Standard mode — fetch admin-stored experiment titles for this subject
      const snap = await getDocs(
        query(collection(db, 'repoMappings'), where('subjectCode', '==', code))
      );
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (docs.length > 0) {
        const sl = subject.toLowerCase();
        const filtered = docs.filter(m =>
          (m.subjectName || '').toLowerCase().includes(sl) ||
          sl.includes((m.subjectName || '').toLowerCase())
        );
        mappings = filtered.length > 0 ? filtered : docs;
      } else {
        // Fallback: search all mappings by name/code
        const allSnap = await getDocs(collection(db, 'repoMappings'));
        const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sl = subject.toLowerCase();
        mappings = all.filter(m =>
          (m.subjectName || '').toLowerCase().includes(sl) ||
          (m.subjectCode || '').toLowerCase() === code.toLowerCase()
        );
      }

      if (!mappings.length) {
        setStep('v3', 'error', `No experiment mapping found for "${subject}" (${code})`);
        showToast('No experiments mapped for this subject. Ask your admin to add them.', 'warning', 5000);
        return;
      }
      // Sort by experiment number
      mappings.sort((a, b) => (parseInt(a.expNo) || 0) - (parseInt(b.expNo) || 0));
    }

    setStep('v3', 'done', `✓ ${mappings.length} experiment(s) found`);
  } catch (err) {
    setStep('v3', 'error', 'Failed to load experiment list: ' + err.message);
    return;
  }

  // ── Step 4: Match each experiment title → student's repo (exact fork first, then fuzzy) ─
  setStep('v4', 'loading', `Matching ${mappings.length} experiment(s) to your repositories...`);
  try {
    // Separate directly-resolved repos (custom mode) from mappings that need matching
    const needsMatching  = mappings.filter(m => !m._directRepo);
    const alreadyMatched = mappings.filter(m =>  m._directRepo);

    // Match: exact fork-name first, fuzzy keyword fallback
    const rawMatched = matchExperimentsToRepos(needsMatching, userRepos, username);

    // Enrich matched experiments with dates and isLive status from userRepos
    const enriched = rawMatched.map(exp => {
      let isLive = false;
      let date   = '';
      if (exp.matched && exp.repoName) {
        const repo = userRepos.find(r => r.name === exp.repoName);
        if (repo) {
          isLive = true; // repo exists in the fetched list → it is live
          if (repo.created_at) {
            date = new Date(repo.created_at)
              .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
              .replace(/\//g, '/');
          }
        }
      }
      return {
        expNo:       exp.expNo || '—',
        date,
        title:       exp.title || '—',
        repoUrl:     exp.repoUrl || '',
        repoName:    exp.repoName || '',
        isLive,
        matchScore:  exp.matchScore || 0,
        matchMethod: exp.matchMethod || 'none',
        isFixed:     exp.matched,
      };
    });

    // Convert directly-resolved custom-mode repos
    const directResults = alreadyMatched.map(m => ({
      expNo:       m.expNo || '—',
      date:        m.date  || '',
      title:       m.title || '—',
      repoUrl:     m.repoUrl,
      repoName:    m._directRepo.name,
      isLive:      true,
      matchScore:  100,
      matchMethod: 'exact-fork',
      isFixed:     false,
    }));

    // Merge & restore original order
    const allResults = [...enriched, ...directResults];
    allResults.sort((a, b) => (parseInt(a.expNo) || 0) - (parseInt(b.expNo) || 0));

    experiments = allResults;

    const exactCount   = experiments.filter(e => e.matchMethod === 'exact-fork').length;
    const fuzzyCount   = experiments.filter(e => e.matchMethod === 'fuzzy').length;
    const missingCount = experiments.filter(e => !e.repoUrl).length;

    let v4Msg = `✓ ${experiments.length - missingCount}/${experiments.length} matched`;
    if (exactCount > 0) v4Msg += ` (${exactCount} exact fork`;
    if (fuzzyCount > 0) v4Msg += exactCount > 0 ? `, ${fuzzyCount} keyword` : ` (${fuzzyCount} keyword`;
    if (exactCount > 0 || fuzzyCount > 0) v4Msg += ')';
    if (missingCount > 0) v4Msg += ` — ${missingCount} not found (add URLs manually)`;

    setStep('v4', 'done', v4Msg);
  } catch (err) {
    setStep('v4', 'error', 'Matching failed: ' + err.message);
  }

  // Step 5 — Build editor
  setStep('v5', 'loading', 'Loading experiment editor...');
  try {
    buildEditor(main, username);
    saveExperiments();
    setStep('v5', 'done', '✓ Editor ready — edit dates, add rows, then preview/download!');
    main.querySelector('#editor-card').style.display = '';
    main.querySelector('#editor-empty').style.display = 'none';
    showToast('Experiments loaded! Edit dates if needed, then preview/download. 📄', 'success', 4000);
  } catch (err) {
    setStep('v5', 'error', 'Editor failed: ' + err.message);
  }
}

// ── Build the editable table ──────────────────────────────────────────────────
function buildEditor(main, username) {
  const tbody = main.querySelector('#exp-tbody');
  const cards = main.querySelector('#exp-cards');
  tbody.innerHTML = '';
  if (cards) cards.innerHTML = '';
  experiments.forEach((exp, i) => addEditorRow(main, exp, i));
}

function addEditorRow(main, exp, i) {
  const tbody = main.querySelector('#exp-tbody');
  const cardsContainer = main.querySelector('#exp-cards');
  const tr = document.createElement('tr');
  tr.dataset.idx = i;

  // Convert date string to input[type=date] value (YYYY-MM-DD) if possible
  let dateVal = '';
  if (exp.date) {
    const m = exp.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) dateVal = `${m[3]}-${m[2]}-${m[1]}`;
    else dateVal = exp.date;
  }

  // ── Desktop table row ──
  tr.innerHTML = `
    <td style="text-align:center;min-width:44px;padding-left:8px;">
      <div class="index-wrapper">
        <input type="text" class="exp-no" value="${exp.expNo || String(i+1).padStart(2,'0')}" />
      </div>
    </td>
    <td>
      <input type="date" class="exp-date" value="${dateVal}" style="min-width:130px" />
    </td>
    <td>
      <input type="text" class="exp-title" value="${exp.title || ''}" placeholder="Experiment name" style="min-width:200px" />
    </td>
    <td>
      <input type="text" class="exp-url url-input" value="${exp.repoUrl || ''}" placeholder="https://github.com/..." style="min-width:180px" />
    </td>
    <td style="text-align:center">
      <span class="qr-cell">${
        exp.isLive
          ? '<div style="background:#dcfce7; width:28px; height:28px; border-radius:8px; border: 1px solid #bbf7d0; display:inline-flex; align-items:center; justify-content:center; margin:auto;" title="Live on GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>'
          : '<div style="background:#fee2e2; width:28px; height:28px; border-radius:8px; border: 1px solid #fecaca; display:inline-flex; align-items:center; justify-content:center; margin:auto;" title="Not Found / Broken URL"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>'
      }</span>
    </td>
    <td style="text-align:center;padding-right:8px;">
      <button class="del-row-btn" title="Remove row"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
    </td>
  `;

  // ── Mobile card ──
  const card = document.createElement('div');
  card.className = 'exp-card';
  card.dataset.idx = i;
  card.innerHTML = `
    <div class="exp-card-header">
      <div class="index-wrapper" style="width:44px">
        <input type="text" class="exp-no" value="${exp.expNo || String(i+1).padStart(2,'0')}" />
      </div>
      <div class="exp-card-title">${exp.title || `Experiment ${i+1}`}</div>
      <button class="del-row-btn" title="Remove"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
    </div>
    <div class="exp-card-field">
      <div class="exp-card-label">📅 Date</div>
      <input type="date" class="exp-date" value="${dateVal}" />
    </div>
    <div class="exp-card-field">
      <div class="exp-card-label">🧪 Experiment Name</div>
      <input type="text" class="exp-title" value="${exp.title || ''}" placeholder="Experiment name" />
    </div>
    <div class="exp-card-field">
      <div class="exp-card-label">🔗 GitHub URL</div>
      <input type="text" class="exp-url url-input" value="${exp.repoUrl || ''}" placeholder="https://github.com/..." />
    </div>
    <div class="exp-card-footer">
      <span class="exp-card-status ${exp.isLive ? 'live' : 'missing'}">
        ${exp.isLive
          ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Live on GitHub'
          : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Not found on GitHub'}
      </span>
    </div>
  `;

  // ── Sync changes back to experiments[] from whichever view is active ──
  const syncRow = (sourceEl) => {
    const idx = parseInt(sourceEl.dataset.idx);
    if (idx < 0 || idx >= experiments.length) return;
    // Read from the table row (desktop) or card (mobile) — whichever fired
    const isCard = sourceEl.classList.contains('exp-card');
    const el = isCard ? card : tr;
    const rawDate = el.querySelector('.exp-date').value;
    let displayDate = rawDate;
    if (rawDate && rawDate.includes('-')) {
      const [y, mo, d] = rawDate.split('-');
      displayDate = `${d}/${mo}/${y}`;
    }
    const isLive = !!el.querySelector('.exp-url').value;
    experiments[idx] = {
      ...experiments[idx],
      expNo:   el.querySelector('.exp-no').value,
      date:    displayDate,
      title:   el.querySelector('.exp-title').value,
      repoUrl: el.querySelector('.exp-url').value,
      isLive:  isLive,
    };

    // Update status indicators dynamically!
    const desktopStatus = tr.querySelector('.qr-cell');
    if (desktopStatus) {
      desktopStatus.innerHTML = isLive
        ? '<div style="background:#dcfce7; width:28px; height:28px; border-radius:8px; border: 1px solid #bbf7d0; display:inline-flex; align-items:center; justify-content:center; margin:auto;" title="Live on GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>'
        : '<div style="background:#fee2e2; width:28px; height:28px; border-radius:8px; border: 1px solid #fecaca; display:inline-flex; align-items:center; justify-content:center; margin:auto;" title="Not Found / Broken URL"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>';
    }

    const mobileStatus = card.querySelector('.exp-card-status');
    if (mobileStatus) {
      mobileStatus.className = `exp-card-status ${isLive ? 'live' : 'missing'}`;
      mobileStatus.innerHTML = isLive
        ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Live on GitHub'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Not found on GitHub';
    }

    // Mirror title to card header display
    if (!isCard) {
      const cardTitle = card.querySelector('.exp-card-title');
      if (cardTitle) cardTitle.textContent = el.querySelector('.exp-title').value || `Experiment ${idx+1}`;
    } else {
      // mirror back to table row
      tr.querySelector('.exp-no').value   = el.querySelector('.exp-no').value;
      tr.querySelector('.exp-date').value = el.querySelector('.exp-date').value;
      tr.querySelector('.exp-title').value = el.querySelector('.exp-title').value;
      tr.querySelector('.exp-url').value  = el.querySelector('.exp-url').value;
    }
    saveExperiments();
  };

  tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => syncRow(tr)));
  card.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => syncRow(card)));

  // Delete row — removes both table row and card
  const deleteRow = () => {
    const idx = parseInt(tr.dataset.idx);
    experiments.splice(idx, 1);
    tr.remove();
    card.remove();
    // Re-index remaining
    tbody.querySelectorAll('tr').forEach((row, newIdx) => { row.dataset.idx = newIdx; });
    cardsContainer?.querySelectorAll('.exp-card').forEach((c, newIdx) => { c.dataset.idx = newIdx; });
    saveExperiments();
  };

  tr.querySelector('.del-row-btn').addEventListener('click', deleteRow);
  card.querySelector('.del-row-btn').addEventListener('click', deleteRow);

  tbody.appendChild(tr);
  if (cardsContainer) cardsContainer.appendChild(card);
}

// ── Build PDF doc ─────────────────────────────────────────────────────────────
async function buildPDFDoc(main) {
  const { generateRecordBookPDF } = await import('../../utils/pdf-generator.js');
  const user = appState.userData;
  const subject = main.querySelector('#rec-subject')?.value || sessionStorage.getItem('rb_subject') || '';
  const code    = main.querySelector('#rec-code')?.value    || sessionStorage.getItem('rb_code')    || '';

  // Read latest values from editor inputs before building
  const tbody = main.querySelector('#exp-tbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      if (i >= experiments.length) return;
      const rawDate = tr.querySelector('.exp-date')?.value || '';
      let displayDate = rawDate;
      if (rawDate && rawDate.includes('-')) {
        const [y, mo, d] = rawDate.split('-');
        displayDate = `${d}/${mo}/${y}`;
      }
      experiments[i] = {
        ...experiments[i],
        expNo:   tr.querySelector('.exp-no')?.value   || experiments[i].expNo,
        date:    displayDate || experiments[i].date,
        title:   tr.querySelector('.exp-title')?.value || experiments[i].title,
        repoUrl: tr.querySelector('.exp-url')?.value   || experiments[i].repoUrl,
        isLive:  !!(tr.querySelector('.exp-url')?.value),
      };
    });
  }

  const studentName    = main.querySelector('#stu-name')?.value    || sessionStorage.getItem('rb_name')    || user?.name           || '';
  const registerNumber = main.querySelector('#stu-regno')?.value   || sessionStorage.getItem('rb_regno')   || user?.registerNumber || '';

  return generateRecordBookPDF({
    subject, code, experiments,
    studentName,
    registerNumber,
  });
}

// ── Load PDF.js Dynamically ───────────────────────────────────────────────────
async function loadPDFJS() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Open PDF in preview modal ─────────────────────────────────────────────────
async function openPDFPreview(main) {
  const btn = main.querySelector('#preview-pdf-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Building...';
  try {
    const doc = await buildPDFDoc(main);

    const iframe = main.querySelector('#pdf-iframe');
    const fallback = main.querySelector('#pdf-fallback-msg');
    const canvasContainer = main.querySelector('#pdf-canvas-container');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    main.querySelector('#pdf-modal').classList.add('open');

    if (isMobile) {
      iframe.style.display = 'none';
      if (fallback) fallback.style.display = 'none';
      if (canvasContainer) {
        canvasContainer.style.display = 'flex';
        canvasContainer.innerHTML = '<div style="margin:auto; font-weight: 600; color: var(--color-on-surface-variant);">⏳ Rendering Preview...</div>';
      }

      try {
        const pdfjsLib = await loadPDFJS();
        const arrayBuffer = doc.output('arraybuffer');
        const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (canvasContainer) canvasContainer.innerHTML = '';
        
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = '100%';
          canvas.style.maxWidth = '800px';
          canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          canvas.style.borderRadius = '4px';
          canvas.style.backgroundColor = 'white';
          
          const renderContext = { canvasContext: context, viewport: viewport };
          await page.render(renderContext).promise;
          if (canvasContainer) canvasContainer.appendChild(canvas);
        }
      } catch (err) {
        console.error('PDF.js render failed:', err);
        if (canvasContainer) canvasContainer.style.display = 'none';
        if (fallback) {
          fallback.style.display = 'flex';
          main.querySelector('#fallback-download-btn').onclick = () => { triggerDownload(main); };
        }
      }
    } else {
      const blob = doc.output('blob');
      const url  = URL.createObjectURL(blob);
      iframe.style.display = 'block';
      if (fallback) fallback.style.display = 'none';
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (iframe._blobUrl) URL.revokeObjectURL(iframe._blobUrl);
      iframe._blobUrl = url;
      iframe.src = url;
    }
  } catch (err) {
    showToast('Preview failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '👁 Preview PDF';
  }
}

// ── Download PDF ──────────────────────────────────────────────────────────────
async function triggerDownload(main) {
  const btn = main.querySelector('#download-pdf-btn');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
  const username = main.querySelector('#gh-username')?.value || sessionStorage.getItem('rb_username') || 'student';
  const code     = main.querySelector('#rec-code')?.value    || sessionStorage.getItem('rb_code')    || 'code';
  try {
    const doc = await buildPDFDoc(main);
    doc.save(`RecordBook_${code}_${username}.pdf`);
    showToast('PDF downloaded! 📥', 'success');
  } catch (err) {
    showToast('PDF failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}
