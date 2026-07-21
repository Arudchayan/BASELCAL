const fs = require('fs');
const content = fs.readFileSync('E:/Repos/BASELCAL/src/courses.ts', 'utf-8');
const codes = [...content.matchAll(/\"code\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const titles = [...content.matchAll(/\"title\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
console.log(JSON.stringify(codes.map((c, i) => ({code: c, title: titles[i]})), null, 2));
