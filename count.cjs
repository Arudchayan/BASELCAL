const fs = require('fs');
const content = fs.readFileSync('E:/Repos/BASELCAL/src/courses.ts', 'utf-8');
const idMatches = [...content.matchAll(/\"id\":\s*\"([^\"]+)\"/g)];
console.log('Total id fields:', idMatches.length);
