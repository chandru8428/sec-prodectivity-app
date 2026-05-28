// Fix A+/B+ grade matching in GpaCalculator.js parsePDF
const fs = require('fs');
let code = fs.readFileSync('src/features/gpa/GpaCalculator.js', 'utf8');

// The bug: \b(O|A\+|A|B\+|B|C|U|SA)\b
// Why it fails for A+/B+:
//   \b after A+ fails because + is non-word char followed by non-word char (space)
//   so the engine matches just "A" instead of "A+"
//
// Fix: use negative lookahead instead:
//   \b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA)(?!\w)
//   - A\+ matches A+ correctly
//   - A(?!\+) matches A only when NOT followed by +
//   - (?!\w) at end prevents partial word matches

const oldGradeWord = String.raw`\b(O|A\+|A|B\+|B|C|U|SA)\b`;
const newGradeWord  = String.raw`\b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA)(?!\w)`;

// Also fix the split pattern used to extract subject name
const oldSplit = String.raw`\b(O|A\+|A|B\+|B|C|U|SA|Pass|Fail|PASS|FAIL)\b`;
const newSplit  = String.raw`\b(O|A\+|A(?!\+)|B\+|B(?!\+)|C|U|SA|Pass|Fail|PASS|FAIL)(?!\w)`;

let count = 0;
const result = code
  .split(oldGradeWord).join(() => { count++; return newGradeWord; })
  .split(oldSplit).join(() => { count++; return newSplit; });

// Simple string replace (no regex, avoids escaping issues)
const r1 = code.split(oldGradeWord).join(newGradeWord);
const r2 = r1.split(oldSplit).join(newSplit);

// Count replacements
const c1 = code.split(oldGradeWord).length - 1;
const c2 = r1.split(oldSplit).length - 1;

fs.writeFileSync('src/features/gpa/GpaCalculator.js', r2, 'utf8');
console.log('Fixed grade pattern occurrences:', c1, '| Fixed split pattern occurrences:', c2);
console.log('Total replacements:', c1 + c2);
