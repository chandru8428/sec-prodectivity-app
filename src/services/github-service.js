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

// Admin-configurable subject-to-repo mapping
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
