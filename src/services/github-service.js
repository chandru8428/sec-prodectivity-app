/**
 * GitHub API Service — For Record Book PDF Maker
 */
const GITHUB_API = 'https://api.github.com';

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

export async function getUserRepos(username) {
  try {
    const res = await fetch(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=updated`);
    if (res.ok) {
      const repos = await res.json();
      return repos.map(r => ({
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        description: r.description,
        language: r.language,
        pushedAt: r.pushed_at,
      }));
    }
    return [];
  } catch (e) {
    console.error('Failed to fetch repos:', e);
    return [];
  }
}

export async function checkRepoExists(username, repoName) {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${username}/${repoName}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is live (reachable, not 404)
 */
export async function checkUrlLive(url) {
  try {
    // Use a no-cors request to check reachability via GitHub API
    // Extract owner/repo from github URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return false;
    const [, owner, repo] = match;
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo.replace(/\.git$/, '')}`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Compute similarity between two strings (Sørensen–Dice coefficient)
 * Returns 0.0 – 1.0
 */
export function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().replace(/[-_]/g, ' ').trim();
  b = b.toLowerCase().replace(/[-_]/g, ' ').trim();
  if (a === b) return 1;

  const bigrams = str => {
    const bg = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bg2 = str.slice(i, i + 2);
      bg.set(bg2, (bg.get(bg2) || 0) + 1);
    }
    return bg;
  };

  const aB = bigrams(a);
  const bB = bigrams(b);
  let intersection = 0;
  for (const [key, count] of aB) {
    if (bB.has(key)) intersection += Math.min(count, bB.get(key));
  }
  return (2 * intersection) / (a.length - 1 + b.length - 1 + 2);
}

/**
 * Find best matching repo from user's repos for a given subject/title
 * Returns { repo, score } where score is 0–1. Only returns if score >= threshold.
 */
export function findBestMatchingRepo(targetTitle, userRepos, threshold = 0.85) {
  let best = null;
  let bestScore = 0;

  for (const repo of userRepos) {
    // Check against repo name and description
    const nameScore = stringSimilarity(targetTitle, repo.name);
    const descScore = repo.description ? stringSimilarity(targetTitle, repo.description) : 0;
    const score = Math.max(nameScore, descScore);

    if (score > bestScore) {
      bestScore = score;
      best = repo;
    }
  }

  if (bestScore >= threshold) {
    return { repo: best, score: bestScore };
  }
  return null;
}

/**
 * Validate all repo mapping URLs and fix broken ones using AI fuzzy matching.
 * Returns updated mappings array with fixedUrl and fixStatus fields.
 */
export async function validateAndFixMappingUrls(mappings, userRepos) {
  const results = await Promise.all(
    mappings.map(async m => {
      const copy = { ...m };
      if (!m.repoUrl) {
        copy.fixStatus = 'missing';
        return copy;
      }

      const live = await checkUrlLive(m.repoUrl);
      if (live) {
        copy.fixStatus = 'live';
        return copy;
      }

      // URL is dead — try to find best match from user repos
      const searchTitle = m.subjectName || m.title || m.subject || '';
      const match = findBestMatchingRepo(searchTitle, userRepos, 0.85);

      if (match) {
        copy.fixStatus = 'fixed';
        copy.fixedUrl = match.repo.url;
        copy.fixScore = Math.round(match.score * 100);
      } else {
        copy.fixStatus = 'broken';
      }

      return copy;
    })
  );
  return results;
}

// Admin-configurable subject-to-repo mapping (fallback if DB unavailable)
export const defaultSubjectRepoMap = [
  { subject: 'Data Structures Lab', expectedRepo: 'ds-lab' },
  { subject: 'DBMS Lab', expectedRepo: 'dbms-lab' },
  { subject: 'OS Lab', expectedRepo: 'os-lab' },
  { subject: 'Computer Networks Lab', expectedRepo: 'cn-lab' },
  { subject: 'Web Technology Lab', expectedRepo: 'web-lab' },
  { subject: 'Machine Learning Lab', expectedRepo: 'ml-lab' },
  { subject: 'Compiler Design Lab', expectedRepo: 'cd-lab' },
  { subject: 'Software Engineering Lab', expectedRepo: 'se-lab' },
];
