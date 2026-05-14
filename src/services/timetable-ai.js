// ── AI Timetable Service — Fallback Only ────────────────────────────────────
// ARCHITECTURE: AI is used ONLY when regex parser confidence < 85.
// AI repairs malformed/incomplete parsing.  It never generates schedules.
// Scheduling is done 100% by timetable-scheduler.js (CSP backtracking).
// ──────────────────────────────────────────────────────────────────────────────

const NVIDIA_URL = '/api/nvidia/v1/chat/completions';
const getModel   = () => import.meta.env.VITE_TIMETABLE_MODEL || 'moonshotai/kimi-k2-instruct';

// ── Core AI call ──────────────────────────────────────────────────────────────
export async function aiCall(prompt, maxTokens = 4096) {
  const key = import.meta.env.VITE_NVIDIA_API_KEY;
  if (!key) throw new Error('VITE_NVIDIA_API_KEY missing in .env — AI fallback unavailable.');
  const r = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.05,
      max_tokens: maxTokens,
    })
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).choices?.[0]?.message?.content?.trim() || '';
}

// ── AI Fallback: Repair Incomplete Parse ──────────────────────────────────────
/**
 * Called ONLY when regex confidence < 85.
 * Sends partial parse result + raw text to AI for repair.
 * AI must return strict JSON matching the schema below.
 *
 * @param {string} rawText        - Original text
 * @param {Array}  partialSubjects - Partial results from regex parser
 * @returns {Array} Repaired subjects array
 */
export async function aiRepairParse(rawText, partialSubjects) {
  const textSnippet = rawText.slice(0, 6000);
  const partialJson = JSON.stringify(partialSubjects.slice(0, 10), null, 2).slice(0, 2000);

  const prompt = `You are a timetable data repair engine.

The regex parser partially extracted timetable data but confidence was low.
Your job: repair and complete the extraction. Return ONLY valid JSON.

PARTIAL PARSE (may be incomplete or wrong):
${partialJson}

ORIGINAL TEXT (ground truth):
${textSnippet}

RULES:
1. Fix subject names, codes, teachers, slots, days, and times.
2. Slot atomicity: each slot must list ALL its day+time class pairs.
3. Valid times ONLY: "8-10", "10-12", "1-3", "3-5"
4. Valid days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
5. Do NOT invent data. Only extract what is in the text.
6. Return ONLY a JSON array — no explanation, no markdown fences.

REQUIRED JSON FORMAT:
[
  {
    "subject_name": "Python Programming",
    "subject_code": "19AI301",
    "credits": 4,
    "teachers": [
      {
        "staff_name": "Krishnamoorthy J",
        "slots": [
          {
            "slot_name": "T2-Q13",
            "classes": [
              { "day": "Wednesday", "time": "3-5" },
              { "day": "Thursday", "time": "10-12" }
            ]
          }
        ]
      }
    ]
  }
]

Return ONLY the JSON array. Nothing else.`;

  const raw = await aiCall(prompt, 5000);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI fallback returned invalid JSON.');

  try {
    const parsed = JSON.parse(match[0]);
    return parsed.map(s => ({ ...s, parser: 'ai-repair', confidence: 70 }));
  } catch {
    throw new Error('AI fallback JSON parse failed.');
  }
}

// ── PDF → Text (unchanged from original) ─────────────────────────────────────
export async function pdfToText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text  = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lineY = null;
    let line  = '';
    for (const item of content.items) {
      if (lineY !== null && Math.abs(item.transform[5] - lineY) > 5) {
        text += line.trim() + '\n';
        line = '';
      }
      lineY = item.transform[5];
      line += item.str + ' ';
    }
    if (line.trim()) text += line.trim() + '\n';
  }

  if (!text.trim()) throw new Error('No text found in PDF. It may be an image-only PDF.');
  return text;
}

// ── Legacy export kept for any old callers ────────────────────────────────────
// These are no longer used by the main wizard (scheduling is CSP-based)
// but kept to avoid breaking any other import references.
export async function extractSubjects(text) {
  const raw = await aiCall(
    `List ALL academic subject names from this timetable text as a JSON array.
Exclude: staff names, room numbers, slot codes, times, dates.
Return ONLY a JSON array of strings. Nothing else.

Text:\n${text.slice(0, 8000)}`, 3000
  );
  const m = raw.match(/\[[\s\S]*?\]/);
  if (m) { try { return JSON.parse(m[0]); } catch { return []; } }
  return [];
}

export async function buildTimetable() {
  throw new Error('buildTimetable() is deprecated. Use timetable-scheduler.js instead.');
}
