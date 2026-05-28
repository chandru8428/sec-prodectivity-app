const fs = require('fs');
let code = fs.readFileSync('src/features/gpa/GpaCalculator.js', 'utf8');

const newParser = `// PDF PARSER -- Blob context-window strategy
//
// PDFs from Saveetha / Anna Univ are table-based. pdfjs extracts each
// table CELL as a separate line using Y-coordinates. So one result row:
//   SH4205 | Principles of Chemistry in Engineering | 6 | B | 4 | Pass
// becomes 6 separate lines. We collapse the whole PDF into one blob and
// search an 800-char window after each subject code.
function parsePDF(text) {
  const blob  = text.replace(/[\\r\\n]+/g, ' ').replace(/\\s{2,}/g, ' ');
  const lines = text.replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n').split('\\n').map(l=>l.trim()).filter(l=>l);

  console.log('[GPA] Blob (first 600):', blob.slice(0, 600));
  console.log('[GPA] Lines (first 25):', lines.slice(0, 25));

  const results = [];
  const seen    = new Set();

  // Strategy 1: Blob context window
  const codeRe = /\\b([A-Z]{2,4}\\d{3,6}[A-Z]?)\\b/g;
  let m;
  while ((m = codeRe.exec(blob)) !== null) {
    const code = m[1].toUpperCase();
    if (seen.has(code)) continue;

    const win = blob.substring(m.index, m.index + 800);
    const gradeM  = win.match(/\\b(O|A\\+|A|B\\+|B|C|U|SA)\\b/);
    const statusM = win.match(/\\b(Pass|Fail|PASS|FAIL|Withdrawal)\\b/i);
    if (!gradeM || !statusM) continue;

    let grade = gradeM[1].toUpperCase();
    if (grade === 'SA') grade = 'O';
    if (!VALID_GRADES.has(grade)) continue;

    // Credits: last standalone 1-6 before result status
    const beforeStatus = win.substring(0, win.toLowerCase().indexOf(statusM[0].toLowerCase()));
    const creditAll    = Array.from(beforeStatus.matchAll(/\\b([1-6])\\b/g));
    let credits = 3;
    if (creditAll.length > 0) credits = parseInt(creditAll[creditAll.length - 1][1], 10);

    // Subject name: between code end and first grade token
    let rawName = win
      .replace(/^[A-Z]{2,4}\\d{3,6}[A-Z]?\\s*[-]?\\s*/i, '')
      .replace(/\\b(ODD|EVEN|JUNIOR|SENIOR|FRESHMAN|SOPHOMORE)[\\s-]*/gi, '')
      .replace(/\\b\\d{8,}\\b/g, '')
      .split(/\\b(O|A\\+|A|B\\+|B|C|U|SA|Pass|Fail|PASS|FAIL)\\b/)[0]
      .replace(/\\b\\d+(?:\\.\\d+)?\\b/g, ' ')
      .replace(/[-]+/g, ' ')
      .replace(/\\s{2,}/g, ' ')
      .trim();
    rawName = rawName.replace(/^[\\s,;:.]+|[\\s,;:.]+$/, '');
    if (!rawName || rawName.length < 2) rawName = 'Subject';

    seen.add(code);
    results.push({ code, name: rawName, grade, credits });
  }
  console.log('[GPA] Strategy 1:', results.length, results);

  // Strategy 2: Line window (code appears at start of line)
  if (results.length === 0) {
    lines.forEach((line, idx) => {
      const cm = line.match(/\\b([A-Z]{2,4}\\d{3,6}[A-Z]?)\\b/);
      if (!cm) return;
      const code = cm[1].toUpperCase();
      if (seen.has(code)) return;
      const ctx = lines.slice(idx, idx + 10).join(' ');
      const gm  = ctx.match(/\\b(O|A\\+|A|B\\+|B|C|U|SA)\\b/);
      const sm  = ctx.match(/\\b(Pass|Fail|PASS|FAIL)\\b/i);
      if (!gm || !sm) return;
      let grade = gm[1].toUpperCase();
      if (grade === 'SA') grade = 'O';
      const cm2 = ctx.match(/\\b([1-6])\\b/);
      seen.add(code);
      const name = line.replace(cm[0],'').replace(/-/g,' ').trim() || 'Subject';
      results.push({ code, name, grade, credits: cm2 ? parseInt(cm2[1],10) : 3 });
    });
    console.log('[GPA] Strategy 2:', results.length);
  }

  return results;
}
`;

const startIdx = code.lastIndexOf('// PDF PARSER', 22500);
const startPos = code.lastIndexOf('\n', startIdx) + 1;
const endPos   = code.indexOf('\nfunction showPreviewPanel', startIdx);

console.log('start:', startPos, 'end:', endPos);
const newCode = code.slice(0, startPos) + newParser + '\n' + code.slice(endPos + 1);
fs.writeFileSync('src/features/gpa/GpaCalculator.js', newCode, 'utf8');
console.log('Done, new size:', newCode.length, 'bytes');
