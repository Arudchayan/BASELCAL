const fs = require('fs');
const code = fs.readFileSync('src/courses.ts', 'utf8');
const titles = [...code.matchAll(/"title":\s*"([^"]+)"/g)].map(m => m[1]);
const modules = [...code.matchAll(/"module":\s*"([^"]+)"/g)].map(m => m[1]);

const counts = {};
titles.forEach(t => counts[t] = (counts[t] || 0) + 1);
console.log('Duplicates:', Object.keys(counts).filter(t => counts[t] > 1));

const allModules = [...new Set(modules)];
console.log('Unique Modules:', allModules);

console.log('Total Titles:', titles.length);
console.log('Total Modules:', modules.length);
