const fs = require('fs');
const content = fs.readFileSync('src/courses.ts', 'utf8');
const regex = /"id":\s*"([^"]+)"/g;
let match;
const ids = [];
while ((match = regex.exec(content)) !== null) {
  ids.push(match[1]);
}
console.log('Total course IDs found:', ids.length);

const evals = fs.readFileSync('C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/course_evaluations.md', 'utf8');
// Some evaluations might use the numeric code only. The id format is PREFIX-CODE. 
// We will check if either the exact id or the numeric code is present in the markdown file.
// Wait, the id is unique, the numeric code might be repeated (e.g., AD-10489-1 and AD-10489-2).
// Let's print out the exact missing IDs.
const missing = ids.filter(id => !evals.includes(id) && !evals.includes(id.replace(/^[^-]+-/, '')));
console.log('Missing count:', missing.length);
console.log(JSON.stringify(missing, null, 2));

const regexTitle = /"id":\s*"([^"]+)",\s*"code":\s*"([^"]+)",\s*"title":\s*"([^"]+)"/g;
let matchTitle;
const missingDetails = [];
while ((matchTitle = regexTitle.exec(content)) !== null) {
    if (missing.includes(matchTitle[1])) {
        missingDetails.push({id: matchTitle[1], code: matchTitle[2], title: matchTitle[3]});
    }
}
fs.writeFileSync('missing.json', JSON.stringify(missingDetails, null, 2));
