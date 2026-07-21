const fs = require('fs');

const unibas = JSON.parse(fs.readFileSync('unibas_courses.json', 'utf8'));
const scrapedByCode = Object.fromEntries(unibas.map(c => [String(c.code), c]));

const code = fs.readFileSync('src/courses.ts', 'utf8');
const courses = JSON.parse(code.replace('export const COURSES = ', '').replace(/;\s*$/, ''));

let updated = 0;
for (const course of courses) {
  if (course.code === 'Learning contract') continue;
  const scraped = scrapedByCode[course.code];
  if (scraped && scraped.schedule && scraped.schedule.length > 0) {
    course.schedule = scraped.schedule.map(s => ({
      day: s.day,
      time: s.time,
      room: s.room === 'n/a' ? (course.schedule?.find(x => x.day === s.day && x.time === s.time)?.room || s.room) : s.room,
    }));
    updated++;
  }
}

// Remove placeholder schedule entries
for (const course of courses) {
  if (!course.schedule) continue;
  course.schedule = course.schedule.filter(s =>
    !(s.time || '').includes('not visible') && !(s.room || '').includes('not visible')
  );
}

const newCode = 'export const COURSES = ' + JSON.stringify(courses, null, 2) + ';\n';
fs.writeFileSync('src/courses.ts', newCode);

// Sync actual_courses.json title fix
if (fs.existsSync('actual_courses.json')) {
  const actual = JSON.parse(fs.readFileSync('actual_courses.json', 'utf8'));
  const e52377 = actual.find(c => c.id === 'E-52377');
  if (e52377) {
    e52377.title = 'Introduction to Topology';
    fs.writeFileSync('actual_courses.json', JSON.stringify(actual, null, 2));
    console.log('Fixed E-52377 title in actual_courses.json');
  }
}

console.log(`Merged schedules from unibas_courses.json for ${updated} courses`);
console.log('Note: Live scrape unavailable — HS2026 detail pages return 404. Used cached scrape.');
