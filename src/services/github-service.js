/**
 * GitHub API Service — Record Maker: GitHub Lab Repo Mapper
 *
 * Multi-signal matching engine:
 *  Signal 1 — Exact normalized match (score 100)
 *  Signal 2 — Experiment number detection
 *  Signal 3 — Acronym alias match (from parentheses in title)
 *  Signal 4 — Fuzzy title comparison (token set / sort / partial)
 *  Signal 5 — Description fallback
 *
 * Short acronyms are word-boundary-checked to prevent false positives.
 */

const GITHUB_API = 'https://api.github.com';

/* ── 1. Username validation ──────────────────────────────────────────────── */
export async function validateUsername(username) {
  try {
    const res = await fetch(`${GITHUB_API}/users/${username}`);
    if (res.ok) {
      const data = await res.json();
      return { valid: true, user: data };
    }
    return { valid: false, error: 'User not found' };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/* ── 2. Fetch ALL public repos (paginated, up to 1000) ───────────────────── */
export async function getUserRepos(username) {
  const allRepos = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const res = await fetch(
        `${GITHUB_API}/users/${username}/repos?per_page=${perPage}&page=${page}&type=all`
      );
      if (!res.ok) {
        if (page === 1) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        break; // stop on error after first page
      }
      const repos = await res.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      allRepos.push(...repos);
      if (repos.length < perPage) break; // last page
      page++;
    } catch (err) {
      if (page === 1) throw err;
      break;
    }
  }

  return allRepos; // raw GitHub repo objects
}

/* ── 3. Normalize a string for matching ──────────────────────────────────── */
export function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[-_]/g, ' ')           // dashes/underscores → spaces
    .replace(/[^a-z0-9\s]/g, ' ')   // remove special chars
    .replace(/\s+/g, ' ')           // collapse spaces
    .trim();
}

/* Extract the repo "slug" from a GitHub URL: everything after the username */
function repoSlugFromUrl(url) {
  if (!url) return '';
  const m = url.match(/github\.com\/[^/]+\/([^/]+)/);
  return m ? m[1] : '';
}

/* Extract acronym aliases from parentheses, e.g. "AES" from "... (AES)" */
function extractAliases(title) {
  const aliases = [];
  const re = /\(([A-Z][A-Z0-9\-]{0,15})\)/g;
  let m;
  while ((m = re.exec(title)) !== null) {
    aliases.push(m[1].toLowerCase());
  }
  return aliases;
}

/* Detect experiment number from a repo name */
function extractExpNumber(name) {
  const n = normalize(name);
  // Patterns: EX-NO-8, EX-NO-08, Exp-8, Experiment-8, Ex No 08, Lab 3
  const patterns = [
    /\bex[\s-]*no[\s-]*(\d+)\b/,
    /\bexp(?:eriment)?[\s-]*(\d+)\b/,
    /\bex[\s-]+(\d+)\b/,
    /\blab[\s-]*(\d+)\b/,
    /\bprg[\s-]*(\d+)\b/,
    /(?:^|[\s-])0*(\d{1,2})(?:[\s-]|$)/,  // standalone number
  ];
  for (const pat of patterns) {
    const m = n.match(pat);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/* Token set ratio — order-insensitive word overlap */
function tokenSetRatio(a, b) {
  const sa = new Set(a.split(' ').filter(Boolean));
  const sb = new Set(b.split(' ').filter(Boolean));
  const intersection = [...sa].filter(w => sb.has(w));
  const union = new Set([...sa, ...sb]);
  return union.size === 0 ? 0 : (intersection.length / union.size) * 100;
}

/* Partial ratio — does one string contain the other? */
function partialRatio(a, b) {
  if (!a || !b) return 0;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (longer.includes(shorter)) return 100;
  // sliding window best match
  let best = 0;
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    const sub = longer.slice(i, i + shorter.length);
    const score = tokenSetRatio(shorter, sub);
    if (score > best) best = score;
  }
  return best;
}

/* Token sort ratio — sort words then compare */
function tokenSortRatio(a, b) {
  const sort = s => s.split(' ').filter(Boolean).sort().join(' ');
  return tokenSetRatio(sort(a), sort(b));
}

/* Word-boundary check: is `acronym` a standalone word in `text`? */
function isWholeWord(text, acronym) {
  if (!text || !acronym) return false;
  const re = new RegExp(`(?:^|\\s)${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
  return re.test(text);
}

/* ── 4. Score one repo against one experiment ────────────────────────────── */
/**
 * @param {object} experiment  — { expNo, title, sampleRepoUrl }
 * @param {object} repo        — raw GitHub repo object
 * @returns {number}           — score 0–100
 */
function scoreRepoAgainstExperiment(experiment, repo) {
  const { expNo, title: adminTitle, sampleRepoUrl } = experiment;
  const repoSlug        = repo.name || '';
  const repoDesc        = repo.description || '';

  // Normalized versions
  const normSlug        = normalize(repoSlug);
  const normDesc        = normalize(repoDesc);
  const normAdminTitle  = normalize(adminTitle);

  // Sample repo slug from admin URL
  const sampleSlug      = repoSlugFromUrl(sampleRepoUrl || '');
  const normSample      = normalize(sampleSlug);

  // Acronym aliases from admin title
  const aliases         = extractAliases(adminTitle || '');

  // Experiment number from admin
  const adminExpNum     = expNo ? parseInt(expNo, 10) : null;

  // Experiment number from student repo name
  const repoExpNum      = extractExpNumber(repoSlug);

  let score = 0;

  /* ── Signal 1: Exact normalized match ────────────────────────────── */
  if (
    (normSample && normSlug === normSample) ||
    (normAdminTitle && normSlug === normAdminTitle)
  ) {
    return 100;
  }

  /* ── Signal 2: Experiment number match ───────────────────────────── */
  if (adminExpNum !== null && repoExpNum !== null && adminExpNum === repoExpNum) {
    score = Math.max(score, 75);
  }

  /* ── Signal 3: Acronym / alias match (word-boundary safe) ────────── */
  for (const alias of aliases) {
    // Only match if alias is a standalone word in the repo slug
    if (isWholeWord(normSlug, alias)) {
      // Ensure it doesn't appear as a substring of a bigger word in the slug
      // (e.g. "aes" inside "caesar" — already prevented by isWholeWord)
      score = Math.max(score, 85);
      break;
    }
    // Also check if alias appears standalone in description
    if (normDesc && isWholeWord(normDesc, alias)) {
      score = Math.max(score, 70);
    }
  }

  /* ── Signal 4: Fuzzy title match ─────────────────────────────────── */
  const fuzzyTargets = [normAdminTitle, normSample].filter(Boolean);
  const fuzzyInputs  = [normSlug, normDesc].filter(Boolean);

  let bestFuzzy = 0;
  for (const target of fuzzyTargets) {
    for (const input of fuzzyInputs) {
      const ts  = tokenSetRatio(target, input);
      const tsr = tokenSortRatio(target, input);
      const pr  = partialRatio(target, input);
      const combined = Math.max(ts, tsr, pr);
      if (combined > bestFuzzy) bestFuzzy = combined;
    }
  }
  score = Math.max(score, bestFuzzy * 0.9); // slightly weight down fuzzy

  /* ── Signal 5: Description fallback ─────────────────────────────── */
  if (normDesc && score < 60) {
    const descMatch = tokenSetRatio(normAdminTitle, normDesc);
    score = Math.max(score, descMatch * 0.75);
  }

  /* ── Experiment number combo boost ──────────────────────────────── */
  if (adminExpNum !== null && repoExpNum !== null && adminExpNum === repoExpNum && score >= 40) {
    score = Math.min(100, score + 15);
  }

  return Math.round(score);
}

/* ── 5. Match all student repos to all admin experiments ─────────────────── */
/**
 * For every admin experiment, find the best student repo.
 * For every student repo, calculate score against every admin experiment.
 * Returns experiments array with matched repo info.
 *
 * @param {Array}  experiments  — admin experiment objects: { expNo, title, sampleRepoUrl }
 * @param {Array}  userRepos    — raw GitHub repo objects
 * @param {string} username     — student's GitHub username (for URL generation)
 * @param {number} threshold    — minimum score to accept (default 80)
 */
export function matchExperimentsToRepos(experiments, userRepos, username, threshold = 80) {
  // Build score matrix: repoIdx → expIdx → score
  const scoreMatrix = userRepos.map(repo =>
    experiments.map(exp => scoreRepoAgainstExperiment(exp, repo))
  );

  // For each experiment, find the best repo
  return experiments.map((exp, expIdx) => {
    let bestRepoIdx  = -1;
    let bestScore    = -1;

    for (let ri = 0; ri < userRepos.length; ri++) {
      const s = scoreMatrix[ri][expIdx];
      if (s > bestScore) {
        bestScore    = s;
        bestRepoIdx  = ri;
      }
    }

    if (bestScore >= threshold && bestRepoIdx >= 0) {
      const repo    = userRepos[bestRepoIdx];
      const repoUrl = repo.html_url || `https://github.com/${username}/${repo.name}`;
      return {
        ...exp,
        matched:    true,
        repoUrl,
        repoName:   repo.name,
        matchScore: bestScore,
        description: repo.description || '',
      };
    }

    return {
      ...exp,
      matched:    false,
      repoUrl:    '',
      repoName:   '',
      matchScore: bestScore >= 0 ? bestScore : 0,
    };
  });
}

/* ── 6. Verify a single repo is live via GitHub API ─────────────────────── */
export async function checkRepoLive(username, repoName) {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${username}/${repoName}`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── Legacy exports (kept for compatibility with existing code) ───────────── */
export async function checkUrlLive(url) {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return false;
    const [, owner, repo] = match;
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo.replace(/\.git$/, '')}`);
    return res.ok;
  } catch {
    return false;
  }
}

export function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  return tokenSetRatio(na, nb) / 100;
}

export function findBestMatchingRepo(targetTitle, userRepos, threshold = 0.8) {
  const fakeExp = { expNo: '', title: targetTitle, sampleRepoUrl: '' };
  let best = null, bestScore = -1;
  for (const repo of userRepos) {
    const s = scoreRepoAgainstExperiment(fakeExp, repo);
    if (s > bestScore) { bestScore = s; best = repo; }
  }
  if (bestScore >= threshold * 100 && best) {
    return { repo: { url: best.html_url, ...best }, score: bestScore / 100 };
  }
  return null;
}

export async function validateAndFixMappingUrls(mappings) {
  return mappings.map(m => ({ ...m, fixStatus: 'pending' }));
}

export const defaultSubjectRepoMap = [];

export function findBestRepo(expTitle, expNo, userRepos, threshold = 0.25) {
  const fakeExp = { expNo, title: expTitle, sampleRepoUrl: '' };
  let best = null, bestScore = -1;
  for (const repo of userRepos) {
    const s = scoreRepoAgainstExperiment(fakeExp, repo);
    if (s > bestScore) { bestScore = s; best = repo; }
  }
  if (bestScore >= threshold * 100 && best) {
    return { repo: best, score: bestScore / 100 };
  }
  return null;
}
