const fs = require('fs');
const path = require('path');

// Target directory
const targetDir = path.join(__dirname, '../src');

// Map of emojis to Lucide icon names or empty string (for removal)
// Some are mapped to plain text like [Alert] if they are typically used in non-HTML contexts
const emojiMap = {
  '✓': 'check',
  '✕': 'x',
  '⚠': 'alert-triangle',
  '☰': 'menu',
  '📊': 'bar-chart-3',
  '📭': 'inbox',
  '📢': 'megaphone',
  '✅': 'check-circle-2',
  '🚨': 'siren',
  '🔑': 'key',
  '📬': 'mail',
  '📧': 'mail',
  '👤': 'user',
  '🔒': 'lock',
  '👁': 'eye',
  '⚙️': 'settings',
  '⚙': 'settings',
  '👋': '', // Removed
  '🚫': 'ban',
  '🎉': 'party-popper',
  '🎓': 'graduation-cap',
  '📆': 'calendar-days',
  '➕': 'plus',
  '🔴': 'circle',
  '🟣': 'circle',
  '🔵': 'circle',
  '📋': 'clipboard-list',
  '🔄': 'refresh-cw',
  '🗑️': 'trash-2',
  '🗑': 'trash-2',
  '👥': 'users',
  '📅': 'calendar',
  '💬': 'message-square',
  '🔗': 'link-2',
  '📤': 'upload-cloud',
  '🛡️': 'shield',
  '🛡': 'shield',
  '⚡': 'zap',
  '⏰': 'alarm-clock',
  '🕐': 'clock',
  '🏛️': 'building-2',
  '🏛': 'building-2',
  '🗓️': 'calendar',
  '🗓': 'calendar',
  '📄': 'file-text',
  '💡': 'lightbulb',
  '🚀': 'rocket',
  '🔥': 'flame',
  '📚': 'book-open',
  '🎯': 'target',
  '📈': 'trending-up',
  '📥': 'download',
  '⏳': 'hourglass',
  '✏️': 'pencil',
  '✏': 'pencil',
  '🔐': 'lock-keyhole',
  '★': 'star',
  '🔔': 'bell',
  '📱': 'smartphone',
  '❓': 'help-circle',
  '📎': 'paperclip',
  '📂': 'folder-open',
  '📌': 'pin',
  '📝': 'file-edit',
  '🔍': 'search',
  '🧪': 'flask-conical',
  '❌': 'x-circle',
  '🌟': 'star',
  '💪': '', // Removed
  '🎫': 'ticket',
  '🏖️': 'umbrella',
  '🏖': 'umbrella',
  '✨': 'sparkles',
  '🖨️': 'printer',
  '🖨': 'printer',
  '💾': 'save',
  '📖': 'book',
  '✗': 'x'
};

// Functions like alert, confirm, prompt, throw Error where HTML is not allowed
const plainTextContextRegex = /(alert|confirm|prompt|Error|console\.(log|error|warn|info))\s*\(/g;

function isInsidePlainTextContext(content, index) {
  // Check roughly 150 characters before the emoji for confirm/alert/Error
  const contextBefore = content.substring(Math.max(0, index - 150), index);
  return /(alert|confirm|prompt|Error|console\.(log|error|warn|info))\s*\([^)]*$/s.test(contextBefore);
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We need to replace emojis one by one.
  for (const [emoji, iconName] of Object.entries(emojiMap)) {
    if (!content.includes(emoji)) continue;

    // Use a regex that matches the exact emoji globally
    // We can't simply use string.replace(emoji) because we need the index to check context
    let startIndex = 0;
    while ((startIndex = content.indexOf(emoji, startIndex)) !== -1) {
      const inPlainText = isInsidePlainTextContext(content, startIndex);
      
      let replacement = '';
      if (inPlainText) {
        // Plain text context: just remove it, or use a text equivalent if crucial
        if (iconName === 'alert-triangle' || iconName === 'siren') replacement = '[Warning]';
        else if (iconName === 'check' || iconName === 'check-circle-2') replacement = '[OK]';
        else replacement = ''; 
      } else {
        // HTML context: replace with <i data-lucide="..."></i>
        // Add a space before/after if needed, but let's just insert the tag.
        replacement = iconName ? `<i data-lucide="${iconName}" class="icon-inline"></i>` : '';
      }

      content = content.substring(0, startIndex) + replacement + content.substring(startIndex + emoji.length);
      // Advance startIndex past the replacement
      startIndex += replacement.length;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      processFile(fullPath);
    }
  }
}

scanDir(targetDir);
console.log('Emoji replacement complete.');
