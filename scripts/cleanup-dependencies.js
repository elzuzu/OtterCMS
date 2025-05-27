const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const cleanupPatterns = [
  '**/test/**',
  '**/tests/**',
  '**/*.md',
  '**/docs/**',
  '**/*.d.ts',
  '**/benchmark/**',
  '**/example/**'
];

function cleanupNodeModules() {
  const base = path.join(__dirname, '..', 'node_modules');
  cleanupPatterns.forEach(pattern => {
    const target = path.join(base, pattern);
    rimraf.sync(target);
  });
}

cleanupNodeModules();
