const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let text = fs.readFileSync(fullPath, 'utf8');
      const original = text;

      // Replace imports/require paths that still reference C-prefixed modules
      text = text.split("'./C").join("'./");
      text = text.split('"./C').join('"./');

      if (text !== original) {
        console.log('PATCH', fullPath);
        fs.writeFileSync(fullPath, text);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'src'));

