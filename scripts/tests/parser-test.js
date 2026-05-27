const text = `19ME533 [4 Credits]
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
UG - 04, T2-H6, AI - MANICKAM S
Date: 16-04-2026 to 06-06-2026
Monday: 13:00 - 14:0014:00 - 15:00
Thursday: 13:00 - 14:0014:00 - 15:00
Tuesday: 13:00 - 14:0014:00 - 15:00`;

// Step 1: Fix concatenated times
const fixed = text.replace(/(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/g, '$1');

// Step 2: Test header detection
const headers = [...fixed.matchAll(/^([A-Z0-9]{4,10})\s+\[(\d+)\s+Credits?\]/gim)];
console.log('=== HEADERS ===');
headers.forEach(m => console.log(' ', m[1], '['+m[2]+'cr]'));

// Step 3: Test slot detection  
const slots = [...fixed.matchAll(/^UG\s*-\s*\d+,\s*([A-Z0-9][A-Z0-9\-]+(?:-[A-Z0-9]+)*),\s*[A-Z]+\s*-\s*(.+)$/gim)];
console.log('\n=== SLOTS ===');
slots.forEach(m => console.log(' ', m[1], '::', m[2].trim()));

// Step 4: Test day+time detection
const daytimes = [...fixed.matchAll(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*(\d{2}:\d{2})/gim)];
console.log('\n=== DAY+TIMES (start hour only) ===');
daytimes.forEach(m => {
  const h = parseInt(m[2].split(':')[0]);
  const slot = h===8?'8-10':h===10?'10-12':h===13?'1-3':h===15?'3-5':'?';
  console.log(' ', m[1], '->', slot);
});
