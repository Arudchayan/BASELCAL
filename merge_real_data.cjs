const fs = require('fs');
const scrapedData = require('./scraped_real_data.json');

const code = fs.readFileSync('src/courses.ts', 'utf8');

// Strip the export and parse
const jsonStr = code.replace('export const COURSES = ', '').replace(/;\s*$/, '');
let courses = JSON.parse(jsonStr);

// Merge
let mergedCount = 0;
for (const course of courses) {
  const scraped = scrapedData.find(s => s.title.toLowerCase() === course.title.toLowerCase());
  if (scraped) {
    course.description = scraped.description;
    course.syllabus = scraped.syllabus;
    course.prerequisites = scraped.prerequisites;
    mergedCount++;
  }
}

console.log(`Merged real data for ${mergedCount} courses.`);

// Write back
const newCode = 'export const COURSES = ' + JSON.stringify(courses, null, 2) + ';\n';
fs.writeFileSync('src/courses.ts', newCode);
