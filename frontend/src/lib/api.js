export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Request failed');
  }
  return data;
}

export function parseRawText(rawText) {
  return apiRequest('/api/parse', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText }),
  });
}

export function optimizeTimetable(payload) {
  return apiRequest('/api/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveTimetable(payload) {
  return apiRequest('/api/timetables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSavedTimetables() {
  return apiRequest('/api/timetables');
}

export function fetchSampleData() {
  return apiRequest('/api/sample-data');
}
