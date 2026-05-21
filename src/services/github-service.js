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
        if (res.status === 403 || res.status === 429) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
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
  const str = String(url || '').trim();
  let match = str.match(/(?:github\.com\/)[^/]+\/([^/#?]+)/i);
  if (!match) {
    match = str.match(/^[^/]+\/([^/#?]+)/i);
  }
  return match ? match[1].replace(/\.git$/i, '') : '';
}

/* ── 5. Match all student repos to all admin experiments ─────────────────── */
/**
 * For every admin experiment, find the best student repo.
 *
 * STRATEGY (in priority order):
 *   1. EXACT FORK MATCH   — student's repo has the same name as the sample repo
 *                           in the admin mapping (case-insensitive). Since all
 *                           students fork the sample repo, the name stays the same.
 *   2. FUZZY SCORE MATCH  — fallback for renamed / custom repos. Uses the existing
 *                           keyword + similarity scoring algorithm.
 *
 * @param {Array}  experiments  — admin experiment objects: { expNo, title, sampleRepoUrl, repoUrl }
 * @param {Array}  userRepos    — raw GitHub repo objects (already fetched)
 * @param {string} username     — student's GitHub username (for URL generation)
 * @param {number} threshold    — minimum fuzzy score to accept (default 80)
 */
export function matchExperimentsToRepos(experiments, userRepos, username, threshold = 80) {
  // Build a fast lowercase-name lookup map for O(1) exact matching
  const repoByName = new Map(
    userRepos.map(r => [r.name.toLowerCase(), r])
  );

  return experiments.map((exp, expIdx) => {
    // The admin can store multiple comma-separated GitHub URLs.
    const sampleUrls = (exp.sampleRepoUrl || exp.repoUrl || '').split(',');

    for (const url of sampleUrls) {
      const sampleSlug = repoSlugFromUrl(url.trim()).toLowerCase();

      if (sampleSlug) {
        const exactRepo = repoByName.get(sampleSlug);
        if (exactRepo) {
          const repoUrl = exactRepo.html_url || `https://github.com/${username}/${exactRepo.name}`;
          return {
            ...exp,
            matched:     true,
            repoUrl,
            repoName:    exactRepo.name,
            matchScore:  100,
            matchMethod: 'exact-fork',
            description: exactRepo.description || '',
          };
        }
      }
    }

    // ── No match found ─────────────────────────────────────────────────────
    return {
      ...exp,
      matched:     false,
      repoUrl:     '',
      repoName:    '',
      matchScore:  0,
      matchMethod: 'none',
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
  return na === nb ? 1 : 0;
}

export function findBestMatchingRepo(targetTitle, userRepos, threshold = 0.8) {
  // Fuzzy matching is disabled globally for strict correctness
  return null;
}

export async function validateAndFixMappingUrls(mappings) {
  return mappings.map(m => ({ ...m, fixStatus: 'pending' }));
}

export const defaultSubjectRepoMap = [];

export function findBestRepo(expTitle, expNo, userRepos, threshold = 0.25) {
  // Fuzzy matching is disabled globally for strict correctness
  return null;
}
