import fs from 'fs';
import path from 'path';

const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
};

const replacements = [
  // Backgrounds
  { regex: /bg-slate-900\/90/g, replacement: 'bg-white/90' },
  { regex: /bg-slate-900\/40/g, replacement: 'bg-brand-50/40' },
  { regex: /bg-slate-900/g, replacement: 'bg-white' },
  { regex: /bg-slate-800\/80/g, replacement: 'bg-brand-50' },
  { regex: /bg-slate-800\/50/g, replacement: 'bg-brand-50' },
  { regex: /bg-slate-800/g, replacement: 'bg-brand-50' },
  { regex: /bg-slate-700/g, replacement: 'bg-brand-100' },
  { regex: /bg-purple-600\/20/g, replacement: 'bg-brand-200/20' },
  { regex: /bg-pink-600\/20/g, replacement: 'bg-brand-200/20' },
  { regex: /bg-red-500\/10/g, replacement: 'bg-brand-100' },
  { regex: /bg-red-500/g, replacement: 'bg-brand-500' },
  { regex: /bg-black\/50/g, replacement: 'bg-brand-900/50' },
  { regex: /bg-black\/80/g, replacement: 'bg-brand-900/80' },
  { regex: /bg-black\/40/g, replacement: 'bg-brand-900/40' },
  { regex: /bg-black/g, replacement: 'bg-white' }, // Be careful with this, but black might be used for modals
  
  // Text colors
  { regex: /text-slate-100/g, replacement: 'text-brand-900' },
  { regex: /text-slate-200/g, replacement: 'text-brand-900' },
  { regex: /text-slate-300/g, replacement: 'text-brand-800' },
  { regex: /text-slate-400/g, replacement: 'text-brand-700' },
  { regex: /text-slate-500/g, replacement: 'text-brand-600' },
  { regex: /text-slate-600/g, replacement: 'text-brand-500' },
  { regex: /text-white/g, replacement: 'text-white' }, // leave text-white on brand-500 buttons
  { regex: /text-purple-400/g, replacement: 'text-brand-600' },
  { regex: /text-pink-500/g, replacement: 'text-brand-500' },
  { regex: /text-red-400/g, replacement: 'text-brand-600' },
  { regex: /text-red-500/g, replacement: 'text-brand-600' },

  // Borders
  { regex: /border-slate-800\/80/g, replacement: 'border-brand-200' },
  { regex: /border-slate-800\/40/g, replacement: 'border-brand-100' },
  { regex: /border-slate-800/g, replacement: 'border-brand-200' },
  { regex: /border-slate-700/g, replacement: 'border-brand-200' },
  { regex: /border-red-500\/30/g, replacement: 'border-brand-300' },
  { regex: /border-t-slate-800/g, replacement: 'border-t-brand-100' },
  { regex: /border-b-slate-800/g, replacement: 'border-b-brand-100' },
  { regex: /border-r-slate-800/g, replacement: 'border-r-brand-100' },
  { regex: /border-l-slate-800/g, replacement: 'border-l-brand-100' },

  // Shadows
  { regex: /shadow-purple-600\/30/g, replacement: 'shadow-brand-500/30' },
  { regex: /shadow-pink-500\/50/g, replacement: 'shadow-brand-500/50' },

  // Fills and strokes
  { regex: /fill-pink-500/g, replacement: 'fill-brand-500' },
  
  // Custom classes from previous dark UI
  { regex: /glass-panel/g, replacement: 'bg-white shadow-soft border border-brand-100' },
  { regex: /gradient-brand/g, replacement: 'bg-brand-500' },
  
  // Placeholder
  { regex: /placeholder-slate-500/g, replacement: 'placeholder-brand-300' },
  
  // Hover/Focus
  { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-brand-100' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-brand-50' },
  { regex: /hover:text-white/g, replacement: 'hover:text-brand-800' },
];

walkDir('./frontend/src', function(filePath) {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.regex, r.replacement);
    });
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
