const fs = require('fs');
const code = fs.readFileSync('src/courses.ts', 'utf8');

// It's just a JS array exported. We can strip `export const COURSES = ` and parse it!
const jsonStr = code.replace('export const COURSES = ', '').replace(/;\s*$/, '');
const courses = JSON.parse(jsonStr);

const uniqueCourses = [];
const seenTitles = new Set();

for (const c of courses) {
  if (!seenTitles.has(c.title)) {
    // Modify the module so it is clear it can count for Electives too, if we wanted, 
    // but for now let's just use the primary module to remove dupes in the UI.
    uniqueCourses.push(c);
    seenTitles.add(c.title);
  }
}

const fileContent = "export const COURSES = " + JSON.stringify(uniqueCourses, null, 2) + ";\n";
fs.writeFileSync('src/courses.ts', fileContent);
console.log('Deduped from', courses.length, 'to', uniqueCourses.length);
