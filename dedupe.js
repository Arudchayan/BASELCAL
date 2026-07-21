import { COURSES } from './src/courses.js';
import fs from 'fs';

const uniqueCourses = [];
const seenTitles = new Set();

for (const c of COURSES) {
  if (!seenTitles.has(c.title)) {
    uniqueCourses.push(c);
    seenTitles.add(c.title);
  }
}

const fileContent = "export const COURSES = " + JSON.stringify(uniqueCourses, null, 2) + ";";
fs.writeFileSync('src/courses.ts', fileContent);
console.log('Deduped from', COURSES.length, 'to', uniqueCourses.length);
