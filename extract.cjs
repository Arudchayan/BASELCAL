const fs = require('fs');
const content = fs.readFileSync('E:/Repos/BASELCAL/src/courses.ts', 'utf-8');
const ids = [...content.matchAll(/\"id\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const codes = [...content.matchAll(/\"code\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const titles = [...content.matchAll(/\"title\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const courses = ids.map((id, i) => ({ id, code: codes[i], title: titles[i] }));
console.log(JSON.stringify(courses, null, 2));
console.log('Total courses:', courses.length);
