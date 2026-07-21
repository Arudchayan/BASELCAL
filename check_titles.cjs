const fs = require('fs');
const content = fs.readFileSync('src/courses.ts', 'utf8');
const regex = /"id":\s*"([^"]+)",\s*"code":\s*"([^"]+)",\s*"title":\s*"([^"]+)"/g;
let match;
const courses = [];
while ((match = regex.exec(content)) !== null) {
  courses.push({id: match[1], code: match[2], title: match[3]});
}

const evals = fs.readFileSync('C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/course_evaluations.md', 'utf8');

const missing = courses.filter(c => {
    if (evals.includes(c.title)) return false;
    if (evals.includes(c.id)) return false;
    if (c.code !== 'Learning contract' && evals.includes(c.code)) return false;
    return true;
});

console.log('Missing count:', missing.length);
console.log(missing);
