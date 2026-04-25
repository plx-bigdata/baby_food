const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  '.claude',
  '__pycache__',
  'node_modules',
  'output',
  '_preview_gen_grain',
  '_preview_icons',
  '_preview_icons_flat',
  '_preview_icons_illustration',
  '_preview_icons_realistic',
]);

function collectJsFiles(dir, result) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(entry => {
    if (entry.name.startsWith('.') && entry.name !== '.env') return;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) collectJsFiles(fullPath, result);
      return;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      result.push(fullPath);
    }
  });
}

const files = [];
collectJsFiles(root, files);

let failed = false;
files.forEach(file => {
  const res = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (res.status !== 0) failed = true;
});

if (failed) {
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
