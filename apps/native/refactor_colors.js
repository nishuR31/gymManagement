const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory()
        ? walkSync(dirFile, filelist)
        : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'OOM' || err.code === 'EISDIR') { }
    }
  });
  return filelist;
};

const files = walkSync('./src');

files.forEach(file => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace style={{ color: colors.xxx }} with className="text-xxx"
  // Note: this is a naive replacement. It doesn't merge classNames well if they already exist on the same line, 
  // but many React Native components have both style and className.
  // Actually, we can just remove `style={{ color: colors.xxx }}` and let manual fixes handle the className, 
  // OR we can inject `className` if it doesn't exist.

  // Let's replace `colors.primary` in style props:
  content = content.replace(/style=\{\{\s*color:\s*colors\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, color) => {
    let cssColor = color.replace(/([A-Z])/g, "-$1").toLowerCase();
    return `className="text-${cssColor}"`;
  });

  content = content.replace(/style=\{\{\s*backgroundColor:\s*colors\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, color) => {
    let cssColor = color.replace(/([A-Z])/g, "-$1").toLowerCase();
    return `className="bg-${cssColor}"`;
  });

  // Replace `const { colors } = useTheme();` with `const { isDark } = useTheme();` (or keep it if it's already there)
  content = content.replace(/const\s+\{\s*([^}]*)colors([^}]*)\}\s*=\s*useTheme\(\);/g, (match, pre, post) => {
    let rest = [pre, post].join(',').split(',').map(s => s.trim()).filter(Boolean).filter(s => s !== 'colors');
    if (!rest.includes('isDark')) rest.push('isDark');
    return `const { ${rest.join(', ')} } = useTheme();`;
  });

  // Replace `colors.primary` passed to icons with `#7A4E2D` (or `#B9825A` if isDark is available)
  content = content.replace(/color=\{colors\.primary\}/g, "color={isDark ? '#B9825A' : '#7A4E2D'}");
  content = content.replace(/color=\{colors\.foreground\}/g, "color={isDark ? '#fafafa' : '#181614'}");
  content = content.replace(/color=\{colors\.mutedForeground\}/g, "color={isDark ? '#A8A29E' : '#78716C'}");
  content = content.replace(/color=\{colors\.border\}/g, "color={isDark ? '#27272a' : '#e5e7eb'}");

  // Fix array style props: style={[{ color: colors.foreground }, props.style]}
  content = content.replace(/style=\{\[\{\s*color:\s*colors\.([a-zA-Z0-9_]+)\s*\},([^\]]+)\]\}/g, (match, color, rest) => {
    let cssColor = color.replace(/([A-Z])/g, "-$1").toLowerCase();
    return `className="text-${cssColor}" style={[${rest.trim()}]}`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
