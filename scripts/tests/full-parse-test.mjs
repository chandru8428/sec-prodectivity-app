// Full integration test: preprocessor + parser on real PDF data
// Run: node scratch/full-parse-test.mjs

// ─── Inline preprocessor ─────────────────────────────────────────────────────
function preprocess(raw) {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/g, '$1');
  text = text.replace(/[^\S\n]+/g, ' ');
  return text.trim();
}

// ─── Inline parser ───────────────────────────────────────────────────────────
const NOISE = [
  /^Enrolled\s*$/i,/^Not Enrolled\s*$/i,/^Full\s*$/i,/^Course overview\s*$/i,
  /^Type a subject name/i,/^No\. of attempts/i,/^Date:\s*\d/i,
  /^OPEN ELECTIVE/i,/^PROFESSIONAL (CORE|ELECTIVE)/i,/^HUMANITIES AND SCIENCES/i
];
function isNoise(l) { return NOISE.some(r => r.test(l.trim())); }

const RE_HEADER   = /^([A-Z0-9]{4,10})\s+\[(\d+)\s+Credits?\]/i;
const RE_SLOT_LINE = /^UG\s*-\s*\d+,\s*([A-Z0-9][A-Z0-9\-]+(?:-[A-Z0-9]+)*),\s*[A-Z]+\s*-\s*(.+)$/i;
const RE_DAY_TIME  = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*(\d{2}:\d{2})/i;

function startHourToSlot(t) {
  const h = parseInt(t.split(':')[0], 10);
  return h===8?'8-10':h===10?'10-12':h===13?'1-3':h===15?'3-5':null;
}

function parseText(text) {
  const lines = text.split('\n').map(l => l.trim());
  const subjects = [];
  let i = 0;
  while (i < lines.length) {
    const hm = lines[i].match(RE_HEADER);
    if (!hm) { i++; continue; }
    const code = hm[1].toUpperCase(), credits = parseInt(hm[2], 10);
    i++;
    let name = '';
    const pre = [];
    while (i < lines.length && !RE_SLOT_LINE.test(lines[i]) && !RE_HEADER.test(lines[i])) {
      pre.push(lines[i]); i++;
    }
    for (const pl of pre) {
      if (!pl || isNoise(pl)) continue;
      if (/[A-Za-z]{2,}/.test(pl) && pl.length >= 3) { name = pl.trim(); break; }
    }
    const subject = { subject_name: name, subject_code: code, credits, teachers: [] };
    while (i < lines.length && !RE_HEADER.test(lines[i])) {
      const line = lines[i];
      if (!line || isNoise(line)) { i++; continue; }
      const sm = line.match(RE_SLOT_LINE);
      if (sm) {
        const slotName = sm[1].toUpperCase().trim(), tName = sm[2].trim();
        i++;
        let teacher = subject.teachers.find(t => t.staff_name === tName);
        if (!teacher) { teacher = { staff_name: tName, slots: [] }; subject.teachers.push(teacher); }
        const slot = { slot_name: slotName, classes: [] };
        teacher.slots.push(slot);
        while (i < lines.length && !RE_SLOT_LINE.test(lines[i]) && !RE_HEADER.test(lines[i])) {
          const inner = lines[i];
          if (!inner || isNoise(inner)) { i++; continue; }
          const dm = inner.match(RE_DAY_TIME);
          if (dm) {
            const day = dm[1].charAt(0).toUpperCase() + dm[1].slice(1).toLowerCase();
            const canonical = startHourToSlot(dm[2]);
            if (canonical && !slot.classes.find(c => c.day === day && c.time === canonical)) {
              slot.classes.push({ day, time: canonical });
            }
          }
          i++;
        }
        continue;
      }
      i++;
    }
    subjects.push(subject);
  }
  return subjects;
}

// ─── Test data (your actual PDF sample) ─────────────────────────────────────
const raw = `19ME533 [4 Credits]
Enrolled 
OPEN ELECTIVE - OPEN ELECTIVE
Course overview
3D Printing Processes
Not Enrolled
Type a subject name...
Full
UG - 08, T2-N2, MECH - Sellakumar S
Date: 16-04-2026 to 06-06-2026
Friday: 13:00 - 14:0014:00 - 15:00
Monday: 13:00 - 14:0014:00 - 15:00
Thursday: 13:00 - 14:0014:00 - 15:00
UG - 08, T2-H9, MECH - CALEB DANIEL R
Date: 16-04-2026 to 06-06-2026
Friday: 13:00 - 14:0014:00 - 15:00
Monday: 10:00 - 11:0011:00 - 12:00
Thursday: 08:00 - 09:0009:00 - 10:00
UG - 08, T2-I11, MECH - Vinothraj U T
Date: 16-04-2026 to 06-06-2026
Saturday: 15:00 - 16:0016:00 - 17:00
Thursday: 15:00 - 16:0016:00 - 17:00
Tuesday: 10:00 - 11:0011:00 - 12:00
19AI404 [3 Credits]
PROFESSIONAL CORE - PROFESSIONAL CORE PC
Course overview
Analysis of Algorithms
No. of attempts: 0
Full
UG - 04, T2-Q4, AI - Selvanayaki S S
Date: 16-04-2026 to 06-06-2026
Monday: 15:00 - 16:0016:00 - 17:00
Saturday: 10:00 - 11:0011:00 - 12:00
Thursday: 08:00 - 09:0009:00 - 10:00
Tuesday: 10:00 - 11:0011:00 - 12:00
UG - 04, T2-H6, AI - MANICKAM S
Date: 16-04-2026 to 06-06-2026
Monday: 13:00 - 14:0014:00 - 15:00
Thursday: 13:00 - 14:0014:00 - 15:00
Tuesday: 13:00 - 14:0014:00 - 15:00
Wednesday: 08:00 - 09:0009:00 - 10:00
19AI541 [4 Credits]
PROFESSIONAL CORE - PROFESSIONAL CORE
Course overview
Cloud Computing
No. of attempts: 0
Full
UG - 04, T2-BLENDED-4, AI - Malathi K
Date: 16-04-2026 to 06-06-2026
Monday: 15:00 - 16:0016:00 - 17:00
Tuesday: 13:00 - 14:0014:00 - 15:00
UG - 04, T2-BLENDED-5, AI - Malathi K
Date: 16-04-2026 to 06-06-2026
Monday: 10:00 - 11:0011:00 - 12:00
Wednesday: 08:00 - 09:0009:00 - 10:00
UG - 04, T2-BLENDED-2, AI - SHOBANA M
Date: 16-04-2026 to 06-06-2026
Friday: 08:00 - 09:0009:00 - 10:00
Tuesday: 13:00 - 14:0014:00 - 15:00`;

// ─── Run ─────────────────────────────────────────────────────────────────────
const cleaned = preprocess(raw);
const subjects = parseText(cleaned);

console.log(`\n✅ Parsed ${subjects.length} subjects\n`);
subjects.forEach(s => {
  console.log(`📚 ${s.subject_name} (${s.subject_code}) [${s.credits}cr]`);
  s.teachers.forEach(t => {
    t.slots.forEach(sl => {
      const days = sl.classes.map(c => `${c.day.slice(0,3)}@${c.time}`).join(', ');
      console.log(`   └─ Slot ${sl.slot_name} | ${t.staff_name} | ${days}`);
    });
  });
});
