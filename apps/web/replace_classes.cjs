const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { search: /\btext-panel\b/g, replace: 'text-primary-foreground' },
  { search: /\bbg-panel\b/g, replace: 'bg-card' },
  { search: /\bbg-backdrop\b/g, replace: 'bg-background/80 backdrop-blur-sm' },
  { search: /\bborder-brand\b/g, replace: 'border-primary' },
  { search: /\bring-brand\b/g, replace: 'ring-primary' },
  { search: /\bbg-line-faint\b/g, replace: 'bg-secondary' },
  { search: /\bbg-brand\b/g, replace: 'bg-primary' },
  { search: /\btext-brand\b/g, replace: 'text-primary' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  let changedFilesCount = 0;

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      changedFilesCount += processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
      }
      
      // Fix instances where text-primary-foreground might have bad contrast on light bg
      content = content.replace(/\bbg-card(?:\/\d+)?(?:\s+[^"']*)?\s+text-primary-foreground\b/g, (match) => match.replace('text-primary-foreground', 'text-foreground'));
      content = content.replace(/\bbg-background(?:\/\d+)?(?:\s+[^"']*)?\s+text-primary-foreground\b/g, (match) => match.replace('text-primary-foreground', 'text-foreground'));
      content = content.replace(/\bbg-secondary(?:\/\d+)?(?:\s+[^"']*)?\s+text-primary-foreground\b/g, (match) => match.replace('text-primary-foreground', 'text-foreground'));

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        changedFilesCount++;
        console.log(`Updated: ${fullPath}`);
      }
    }
  }

  return changedFilesCount;
}

const count = processDirectory(srcDir);
console.log(`\nReplacement complete. Modified ${count} files.`);
