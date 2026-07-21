/**
 * Mirror src/courses.ts → actual_courses.json (audit / CHECK 7).
 * Run after catalog edits: npm run sync:catalog
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const coursesPath = path.join(root, 'src', 'courses.ts');
const outPath = path.join(root, 'actual_courses.json');

const raw = fs.readFileSync(coursesPath, 'utf8');
const courses = JSON.parse(raw.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
fs.writeFileSync(outPath, `${JSON.stringify(courses, null, 2)}\n`);
console.log(`Synced ${courses.length} courses → actual_courses.json`);
