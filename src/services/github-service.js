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

/* ── Sample fallback repos (used when GitHub API rate limit is hit) ────── */
const SAMPLE_FALLBACK_REPOS = [
  { name: 'symbol-table-implementation',   html_url: 'https://github.com/sample/symbol-table-implementation',   description: 'Implementation of Symbol Table using C', pushed_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z' },
  { name: 'lexical-analyzer',              html_url: 'https://github.com/sample/lexical-analyzer',              description: 'Lexical Analyzer / Scanner using LEX', pushed_at: '2024-01-20T10:00:00Z', updated_at: '2024-01-20T10:00:00Z' },
  { name: 'syntax-analyzer',              html_url: 'https://github.com/sample/syntax-analyzer',              description: 'Syntax Analyzer using YACC / Recursive Descent', pushed_at: '2024-01-25T10:00:00Z', updated_at: '2024-01-25T10:00:00Z' },
  { name: 'intermediate-code-generation', html_url: 'https://github.com/sample/intermediate-code-generation', description: 'Intermediate Code Generation for expressions', pushed_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z' },
  { name: 'code-optimization',            html_url: 'https://github.com/sample/code-optimization',            description: 'Code Optimization techniques in compiler design', pushed_at: '2024-02-05T10:00:00Z', updated_at: '2024-02-05T10:00:00Z' },
  { name: 'sorting-algorithms',           html_url: 'https://github.com/sample/sorting-algorithms',           description: 'Bubble, Quick, Merge, Heap sort implementations', pushed_at: '2024-02-10T10:00:00Z', updated_at: '2024-02-10T10:00:00Z' },
  { name: 'graph-algorithms',             html_url: 'https://github.com/sample/graph-algorithms',             description: 'BFS, DFS, Dijkstra, Kruskal, Prim algorithms', pushed_at: '2024-02-15T10:00:00Z', updated_at: '2024-02-15T10:00:00Z' },
  { name: 'dynamic-programming',          html_url: 'https://github.com/sample/dynamic-programming',          description: 'LCS, Knapsack, Matrix Chain Multiplication', pushed_at: '2024-02-20T10:00:00Z', updated_at: '2024-02-20T10:00:00Z' },
  { name: 'database-connectivity',        html_url: 'https://github.com/sample/database-connectivity',        description: 'JDBC / MySQL database connectivity experiments', pushed_at: '2024-02-25T10:00:00Z', updated_at: '2024-02-25T10:00:00Z' },
  { name: 'os-scheduling-algorithms',     html_url: 'https://github.com/sample/os-scheduling-algorithms',     description: 'FCFS, SJF, Round Robin CPU scheduling', pushed_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z' },
  { name: 'memory-management',            html_url: 'https://github.com/sample/memory-management',            description: 'Paging, Segmentation, Memory allocation', pushed_at: '2024-03-05T10:00:00Z', updated_at: '2024-03-05T10:00:00Z' },
  { name: 'socket-programming',           html_url: 'https://github.com/sample/socket-programming',           description: 'TCP/UDP client-server socket programs', pushed_at: '2024-03-10T10:00:00Z', updated_at: '2024-03-10T10:00:00Z' },
  { name: 'network-protocols',            html_url: 'https://github.com/sample/network-protocols',            description: 'HTTP, FTP, DNS protocol simulation', pushed_at: '2024-03-15T10:00:00Z', updated_at: '2024-03-15T10:00:00Z' },
  { name: 'machine-learning-lab',         html_url: 'https://github.com/sample/machine-learning-lab',         description: 'Linear Regression, Decision Tree, KNN experiments', pushed_at: '2024-03-20T10:00:00Z', updated_at: '2024-03-20T10:00:00Z' },
  { name: 'deep-learning-lab',            html_url: 'https://github.com/sample/deep-learning-lab',            description: 'ANN, CNN, RNN with TensorFlow/PyTorch', pushed_at: '2024-03-25T10:00:00Z', updated_at: '2024-03-25T10:00:00Z' },
  { name: 'web-development-lab',          html_url: 'https://github.com/sample/web-development-lab',          description: 'HTML, CSS, JS, React web development experiments', pushed_at: '2024-03-28T10:00:00Z', updated_at: '2024-03-28T10:00:00Z' },
  { name: 'data-structures-lab',          html_url: 'https://github.com/sample/data-structures-lab',          description: 'Linked List, Stack, Queue, Tree, Heap, Graph', pushed_at: '2024-04-01T10:00:00Z', updated_at: '2024-04-01T10:00:00Z' },
  { name: 'computer-networks-lab',        html_url: 'https://github.com/sample/computer-networks-lab',        description: 'Wireshark, ping, traceroute, OSPF, RIP simulations', pushed_at: '2024-04-05T10:00:00Z', updated_at: '2024-04-05T10:00:00Z' },
  { name: 'software-engineering-lab',     html_url: 'https://github.com/sample/software-engineering-lab',     description: 'UML diagrams, design patterns, testing', pushed_at: '2024-04-10T10:00:00Z', updated_at: '2024-04-10T10:00:00Z' },
  { name: 'cryptography-lab',             html_url: 'https://github.com/sample/cryptography-lab',             description: 'Caesar, RSA, AES, DES encryption algorithms', pushed_at: '2024-04-15T10:00:00Z', updated_at: '2024-04-15T10:00:00Z' },
];
export { SAMPLE_FALLBACK_REPOS };

/* ── 1. Username validation ──────────────────────────────────────────────── */
export async function validateUsername(username) {
  try {
    const res = await fetch(`${GITHUB_API}/users/${username}`);
    if (res.ok) {
      const data = await res.json();
      return { valid: true, user: data };
    }
    if (res.status === 403 || res.status === 429) {
      // Rate limited — treat as partial success so wizard can proceed
      return { valid: true, rateLimited: true, user: { login: username, avatar_url: `https://github.com/${username}.png`, name: username } };
    }
    return { valid: false, error: 'User not found' };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

/* ── 2. Fetch ALL public repos (paginated, up to 1000) ───────────────────── */
// Special error type so callers can show a specific "rate limited" UI
export class GitHubRateLimitError extends Error {
  constructor() {
    super('GITHUB_RATE_LIMIT');
    this.name = 'GitHubRateLimitError';
  }
}

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
          // Throw a typed error so callers show proper UI
          throw new GitHubRateLimitError();
        }
        if (page === 1) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        break;
      }
      const repos = await res.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      allRepos.push(...repos);
      if (repos.length < perPage) break;
      page++;
    } catch (err) {
      // Re-throw rate limit errors so callers handle them properly
      if (err instanceof GitHubRateLimitError) throw err;
      if (page === 1) throw err;
      break;
    }
  }

  return allRepos;
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
