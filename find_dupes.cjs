const fs = require('fs');
const code = fs.readFileSync('src/courses.ts', 'utf8');
const titles = [...code.matchAll(/title:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const counts = {};
titles.forEach(t => counts[t] = (counts[t] || 0) + 1);
console.log('Duplicates:', Object.entries(counts).filter(e => e[1] > 1));
