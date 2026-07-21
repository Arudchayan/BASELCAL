const fs = require('fs');
const content = fs.readFileSync('E:/Repos/BASELCAL/src/courses.ts', 'utf-8');
const ids = [...content.matchAll(/\"id\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const codes = [...content.matchAll(/\"code\":\s*\"([^\"]+)\"/g)].map(m => m[1]);
const titles = [...content.matchAll(/\"title\":\s*\"([^\"]+)\"/g)].map(m => m[1]);

const seenTitles = new Set();
const uniqueCourses = [];
for (let i = 0; i < ids.length; i++) {
    if (codes[i] !== "Learning contract" && !seenTitles.has(titles[i])) {
        seenTitles.add(titles[i]);
        uniqueCourses.push({ id: ids[i], code: codes[i], title: titles[i] });
    }
}
fs.writeFileSync('E:/Repos/BASELCAL/unique_by_title.json', JSON.stringify(uniqueCourses, null, 2));
console.log('Unique titles count:', uniqueCourses.length);
