const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu;

const uniqueEmojis = new Set();
const emojiContexts = {};

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html') || fullPath.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(emojiRegex);
      if (matches) {
        matches.forEach(e => {
          uniqueEmojis.add(e);
          if (!emojiContexts[e]) emojiContexts[e] = [];
          if (emojiContexts[e].length < 1) {
            const idx = content.indexOf(e);
            emojiContexts[e].push(content.substring(Math.max(0, idx - 20), Math.min(content.length, idx + 20)).replace(/\n/g, ' '));
          }
        });
      }
    }
  }
}
scanDir('./src');
console.log(Array.from(uniqueEmojis).map(e => `${e} : ${emojiContexts[e][0]}`).join('\n'));
