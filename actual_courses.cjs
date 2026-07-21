const fs = require('fs');
let content = fs.readFileSync('E:/Repos/BASELCAL/src/courses.ts', 'utf-8');
content = content.replace('export const COURSES =', 'module.exports = ');
fs.writeFileSync('E:/Repos/BASELCAL/courses.cjs', content);
const courses = require('E:/Repos/BASELCAL/courses.cjs');
console.log('Array length:', courses.length);
fs.writeFileSync('E:/Repos/BASELCAL/actual_courses.json', JSON.stringify(courses, null, 2));
