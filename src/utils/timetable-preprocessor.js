/**
 * timetable-preprocessor.js — v2, tuned for exact college PDF format
 * Minimal processing — the PDF text is already structured line-by-line.
 * Main job: fix concatenated times, normalize line endings, remove garbage.
 */

export function preprocess(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = fixConcatenatedTimes(text);
  text = text.replace(/[^\S\n]+/g, ' ');       // collapse horizontal spaces
  text = text.replace(/\n{3,}/g, '\n\n');       // max 2 blank lines
  return text.trim();
}

/**
 * Fix concatenated time strings on Day lines.
 * "Friday: 13:00 - 14:0014:00 - 15:00"
 *  → "Friday: 13:00 - 15:00"   (we just need the start hour)
 *
 * The pattern is: HH:MM - HH:MMHH:MM - HH:MM  (no space between end of first and start of second)
 * We normalize it to keep only the first time's start → we derive the 2-hour slot from start hour.
 */
function fixConcatenatedTimes(text) {
  // Match: two consecutive time ranges with no separator
  // e.g.  13:00 - 14:0014:00 - 15:00
  return text.replace(
    /(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/g,
    '$1'   // keep only the first range; the start hour is enough
  );
}

export function splitIntoBlocks(text) {
  return text.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
}
