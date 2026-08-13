const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

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

      // Replace text-primary-foreground with text-foreground, EXCEPT when the line contains bg-primary
      // This is a rough heuristic but handles 95% of the cases we saw in the grep output.
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('text-primary-foreground') && !line.includes('bg-primary')) {
          // If it's a small badge label or a giant number, we want it to be text-foreground or text-muted-foreground.
          // Replace it with text-foreground.
          lines[i] = line.replace(/text-primary-foreground/g, 'text-foreground');
        }
      }
      content = lines.join('\n');

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
