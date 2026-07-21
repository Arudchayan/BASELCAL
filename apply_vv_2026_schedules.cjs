const fs = require('fs');

const VV_BASE = 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=';

// Verified from live VV (HS2026 / FS2026), July 2026
const SCHEDULES_BY_CODE = {
  '10489': [
    { day: 'Thursday', time: '08:15 - 10:00', room: 'Alte Universität, Hörsaal -101' },
    { day: 'Friday', time: '08:15 - 10:00', room: 'Alte Universität, Hörsaal -101' },
  ],
  '11037': [
    { day: 'Tuesday', time: '10:15 - 12:00', room: 'Spiegelgasse 1, Seminarraum 00.003' },
  ],
  '20980': [
    { day: 'Monday', time: '10:15 - 12:00', room: 'Biozentrum, Hörsaal U1.141' },
    { day: 'Tuesday', time: '10:15 - 12:00', room: 'Kollegienhaus, Hörsaal 120' },
  ],
  '62060': [
    { day: 'Friday', time: '10:15 - 12:00', room: 'Kollegienhaus, Hörsaal 114' },
  ],
  '66096': [
    { day: 'Monday', time: '16:15 - 18:00', room: 'Kollegienhaus, Hörsaal 116' },
    { day: 'Tuesday', time: '16:15 - 18:00', room: 'Kollegienhaus, Seminarraum 104' },
    { day: 'Thursday', time: '08:15 - 10:00', room: 'Kollegienhaus, Hörsaal 119' },
  ],
  '45402': [
    { day: 'Thursday', time: '10:15 - 12:00', room: 'Spiegelgasse 5, Seminarraum 05.002' },
    { day: 'Friday', time: '10:15 - 12:00', room: 'Spiegelgasse 5, Seminarraum 05.002' },
  ],
  '77778': [
    { day: 'Tuesday', time: '12:15 - 14:00', room: 'Spiegelgasse 1, Seminarraum 00.003' },
    { day: 'Thursday', time: '14:15 - 16:00', room: 'Spiegelgasse 5, Seminarraum 05.001' },
  ],
};

const code = fs.readFileSync('src/courses.ts', 'utf8');
const courses = JSON.parse(code.replace('export const COURSES = ', '').replace(/;\s*$/, ''));

let updated = 0;
for (const course of courses) {
  if (course.code === 'Learning contract') continue;

  if (SCHEDULES_BY_CODE[course.code]) {
    course.schedule = SCHEDULES_BY_CODE[course.code];
    updated++;
  }

  if (/^\d+$/.test(course.code)) {
    course.url = VV_BASE + course.code;
  }
}

fs.writeFileSync('src/courses.ts', 'export const COURSES = ' + JSON.stringify(courses, null, 2) + ';\n');
console.log(`Applied verified VV 2026 schedules to ${updated} course entries`);
console.log('Updated URLs to course-directory search format');
