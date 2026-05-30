import { db, collection, addDoc, getDocs, serverTimestamp } from '../lib/firebase.js';

/**
 * Logs usage of a specific tool to Firestore.
 * @param {string} toolName - Name of the tool (e.g., 'GPA Calculator', 'AI Schedule Crafter', 'Record Book')
 * @param {string} action - Action performed (e.g., 'calculated', 'generated', 'downloaded')
 * @param {object} metadata - Optional additional data
 */
export async function logToolUsage(toolName, action = 'used', metadata = {}) {
  try {
    const userStr = localStorage.getItem('edusync_user');
    let userId = 'anonymous';
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.registerNumber || user.email || 'unknown';
    }

    await addDoc(collection(db, 'analytics_events'), {
      toolName,
      action,
      userId,
      timestamp: serverTimestamp(),
      ...metadata
    });
  } catch (error) {
    console.warn(`Failed to log analytics for ${toolName}:`, error);
  }
}

/**
 * Retrieves aggregated analytics data for the Admin Dashboard.
 * Returns an object with counts.
 */
export async function getToolUsageStats() {
  try {
    const snap = await getDocs(collection(db, 'analytics_events'));
    const stats = {
      aiSchedules: 0,
      aiSchedulesUsers: new Set(),
      gpaCalculations: 0,
      gpaUsers: new Set(),
      cgpaCalculations: 0,
      cgpaUsers: new Set(),
      recordsGenerated: 0,
      recordsGeneratedUsers: new Set(),
      recordsDownloaded: 0,
      recordsDownloadedUsers: new Set(),
      appDownloads: 0,
      appDownloadsUsers: new Set(),
      totalEvents: snap.size
    };

    snap.docs.forEach(doc => {
      const data = doc.data();
      const user = data.userId || 'unknown';
      if (data.toolName === 'AI Schedule Crafter') { stats.aiSchedules++; stats.aiSchedulesUsers.add(user); }
      if (data.toolName === 'GPA Calculator') { stats.gpaCalculations++; stats.gpaUsers.add(user); }
      if (data.toolName === 'CGPA Calculator') { stats.cgpaCalculations++; stats.cgpaUsers.add(user); }
      if (data.toolName === 'Record Book') {
        if (data.action === 'generated') { stats.recordsGenerated++; stats.recordsGeneratedUsers.add(user); }
        if (data.action === 'downloaded') { stats.recordsDownloaded++; stats.recordsDownloadedUsers.add(user); }
      }
      if (data.toolName === 'App Download') {
        stats.appDownloads++; stats.appDownloadsUsers.add(user);
      }
    });

    return {
      aiSchedules: stats.aiSchedules,
      aiSchedulesUsers: stats.aiSchedulesUsers.size,
      gpaCalculations: stats.gpaCalculations,
      gpaUsers: stats.gpaUsers.size,
      cgpaCalculations: stats.cgpaCalculations,
      cgpaUsers: stats.cgpaUsers.size,
      recordsGenerated: stats.recordsGenerated,
      recordsGeneratedUsers: stats.recordsGeneratedUsers.size,
      recordsDownloaded: stats.recordsDownloaded,
      recordsDownloadedUsers: stats.recordsDownloadedUsers.size,
      appDownloads: stats.appDownloads,
      appDownloadsUsers: stats.appDownloadsUsers.size,
      totalEvents: stats.totalEvents
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      aiSchedules: 0, aiSchedulesUsers: 0,
      gpaCalculations: 0, gpaUsers: 0,
      cgpaCalculations: 0, cgpaUsers: 0,
      recordsGenerated: 0, recordsGeneratedUsers: 0,
      recordsDownloaded: 0, recordsDownloadedUsers: 0,
      appDownloads: 0, appDownloadsUsers: 0,
      totalEvents: 0
    };
  }
}
