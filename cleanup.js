import fs from 'fs';
import path from 'path';

const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
};

const processClassName = (match, classString) => {
  let classes = classString.split(/\s+/).filter(Boolean);
  
  // 1. Remove specific unwanted classes
  classes = classes.filter(c => {
    if (c.includes('#090d16')) return false;
    if (c.startsWith('shadow-') && c !== 'shadow-sm' && c !== 'shadow-soft' && c !== 'shadow-inner' && c !== 'drop-shadow-md') return false;
    if (c.startsWith('backdrop-blur-') && c !== 'backdrop-blur-sm') return false;
    if (c.startsWith('ring-')) return false; // remove excessive rings unless focus rings
    return true;
  });

  // 2. Standardize border radius
  classes = classes.map(c => {
    if (c === 'rounded-3xl' || c === 'rounded-2xl') return 'rounded-xl';
    return c;
  });

  // 3. Deduplicate borders
  let hasBorder = false;
  let hasBorderColor = false;
  classes = classes.filter(c => {
    if (c === 'border') {
      if (hasBorder) return false;
      hasBorder = true;
      return true;
    }
    if (c.match(/^border-(brand|white|transparent)/)) {
      if (hasBorderColor) return false;
      hasBorderColor = true;
      return true;
    }
    return true;
  });
  
  // Clean up stray double borders
  classes = classes.filter((c, i, arr) => arr.indexOf(c) === i);

  return `className="${classes.join(' ')}"`;
};

const regex = /className="([^"]+)"/g;
const regexTemplate = /className=\{`([^`]+)`\}/g;

walkDir('./frontend/src', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace standard classNames
    content = content.replace(regex, processClassName);
    
    // Simple manual replacements for leftovers
    content = content.replace(/bg-\[#090d16\]\/[0-9]+/g, 'bg-white');
    content = content.replace(/shadow-soft/g, 'shadow-sm');
    content = content.replace(/bg-brand-900\/80/g, 'bg-black/40');
    content = content.replace(/glass-panel/g, ''); // Ensure glass panel is gone
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Cleaned', filePath);
    }
  }
});
