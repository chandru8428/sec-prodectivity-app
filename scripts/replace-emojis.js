import fs from 'fs';
import path from 'path';

const emojiMap = {
  '📤': 'upload',
  '📝': 'file-edit',
  '📊': 'bar-chart-2',
  '🧪': 'flask-conical',
  '📌': 'pin',
  '📅': 'calendar',
  '👤': 'user',
  '📚': 'book',
  '📖': 'book-open',
  '🏛️': 'landmark',
  '🏛': 'landmark',
  '✅': 'check-circle-2',
  '👁️': 'eye',
  '👁': 'eye',
  '📋': 'clipboard',
  '🔄': 'refresh-cw',
  '🗑️': 'trash-2',
  '🗑': 'trash-2',
  '🔍': 'search',
  '🎓': 'graduation-cap',
  '🚀': 'rocket',
  '🏖️': 'palmtree',
  '🏖': 'palmtree',
  '🎫': 'ticket',
  '⭐': 'star',
  '⚙️': 'settings',
  '⚙': 'settings',
  '⚠️': 'alert-triangle',
  '⚠': 'alert-triangle',
  'ℹ️': 'info',
  'ℹ': 'info',
  '💬': 'message-square',
  '✏️': 'pencil',
  '✏': 'pencil',
  '⬇️': 'arrow-down',
  '✨': 'sparkles',
  '❌': 'x-circle',
  '🔑': 'key',
  '🔒': 'lock',
  '🔓': 'unlock',
  '🚪': 'log-out',
  '💡': 'lightbulb',
  '✓': 'check',
  '✗': 'x',
  '👋': 'hand',
  '📧': 'mail',
  '🔒': 'lock',
  '👑': 'crown',
  '📈': 'trending-up',
  '📉': 'trending-down',
  '🎉': 'party-popper',
  '⏰': 'clock',
  '🛡️': 'shield',
  '🛡': 'shield',
  '👍': 'thumbs-up',
  '👎': 'thumbs-down',
  '🔔': 'bell',
  '🔥': 'flame',
  '📱': 'smartphone',
  '💻': 'laptop',
  '📁': 'folder',
  '📂': 'folder-open',
  '📄': 'file',
  '🛠️': 'wrench',
  '🛠': 'wrench',
  '⏱️': 'timer',
  '⏱': 'timer',
  '⏳': 'hourglass',
  '🛑': 'octagon-alert',
  '❗': 'alert-circle',
  '❓': 'help-circle',
  '🔴': 'circle-dot',
  '🔵': 'circle',
  '🟣': 'circle-dashed',
  '👥': 'users',
  '🔗': 'link',
  '⚡': 'zap',
  '📆': 'calendar-days',
  '🚨': 'alert-octagon',
  '🕐': 'clock',
  '📢': 'megaphone',
  '🗓': 'calendar',
  '🗓️': 'calendar',
  '🎯': 'target',
  '📥': 'inbox',
  '🔐': 'lock-keyhole',
  '★': 'star',
  '📎': 'paperclip',
  '📭': 'mailbox',
  '✍': 'pen',
  '✍️': 'pen',
  '➕': 'plus',
  '🌟': 'star',
  '💪': 'activity',
  '🖨': 'printer',
  '🖨️': 'printer',
  '💾': 'save',
  '☰': 'menu',
  '📬': 'mail',
  '🚫': 'ban',
  '✕': 'x'
};

const iconTemplate = (icon) => `<i data-lucide="${icon}" class="icon-inline"></i>`;

function replaceEmojisInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Regex to match all emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/gu;

  content = content.replace(emojiRegex, (match) => {
    // Some emojis have variation selectors (like \uFE0F). We should try exact match or strip it.
    let baseMatch = match;
    if (emojiMap[baseMatch]) {
      changed = true;
      return iconTemplate(emojiMap[baseMatch]);
    }
    
    baseMatch = match.replace(/[\uFE0F]/g, '');
    if (emojiMap[baseMatch]) {
      changed = true;
      return iconTemplate(emojiMap[baseMatch]);
    }

    console.log(`Unmapped emoji: ${match} in ${filePath}`);
    // If not mapped, just return it so we don't break things, or replace with a generic icon.
    // changed = true;
    // return iconTemplate('smile');
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      replaceEmojisInFile(fullPath);
    }
  });
}

walk(path.join(process.cwd(), 'src'));
console.log('Emoji replacement complete.');
