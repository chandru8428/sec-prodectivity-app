const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      try {
        execSync(`node -c "${fullPath}"`, { stdio: 'ignore' });
      } catch (e) {
        console.error('Syntax error in:', fullPath);
      }
    }
  }
}
scanDir('./src');
console.log('Syntax check complete.');
