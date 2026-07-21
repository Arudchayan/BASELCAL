const { chromium } = require('playwright');
const fs = require('fs');

const PRESET_CODES = [
  '10489', '20980', '62060', '66096', '45402', '11680', '11681', '19300',
  '11039', '10906', '62061', '17165', '13548', '45366', '15729',
  '11037', '77777', '66937', '60835', '67924', '55662',
];

const DAY_MAP = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  montag: 'Monday', dienstag: 'Tuesday', mittwoch: 'Wednesday',
  donnerstag: 'Thursday', freitag: 'Friday', samstag: 'Saturday',
};

function normalizeDay(raw) {
  const key = (raw || '').toLowerCase().trim();
  return DAY_MAP[key] || raw;
}

async function scrapeCourse(page, code) {
  const url = `https://vorlesungsverzeichnis.unibas.ch/en/details?id=${code}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const sessions = [];
      const bodyText = document.body.innerText;

      // Try table rows with day/time patterns
      const rows = Array.from(document.querySelectorAll('tr, .row, li, p, div'));
      const timeRe = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;
      const dayRe = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag)/i;

      for (const el of rows) {
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 300) continue;
        const timeMatch = text.match(timeRe);
        const dayMatch = text.match(dayRe);
        if (timeMatch && dayMatch) {
          // Room: text after time, or in same block
          let room = '';
          const afterTime = text.split(timeMatch[0])[1] || '';
          const roomParts = afterTime.replace(/^\s*[-–,]\s*/, '').trim();
          if (roomParts && roomParts.length < 120 && !roomParts.match(timeRe)) {
            room = roomParts.split('\n')[0].trim();
          }
          sessions.push({
            day: dayMatch[1],
            time: `${timeMatch[1]} - ${timeMatch[2]}`,
            room: room || 'n/a',
            raw: text.slice(0, 200),
          });
        }
      }

      // Dedupe sessions
      const seen = new Set();
      const unique = [];
      for (const s of sessions) {
        const key = `${s.day}|${s.time}|${s.room}`;
        if (!seen.has(key)) { seen.add(key); unique.push(s); }
      }

      const title = document.querySelector('h1, h2, .title')?.innerText?.trim() || '';
      return { title, sessions: unique, bodySnippet: bodyText.slice(0, 500) };
    });

    return {
      code,
      url,
      title: data.title,
      schedule: data.sessions.map(s => ({
        day: normalizeDay(s.day),
        time: s.time,
        room: s.room,
      })),
      ok: data.sessions.length > 0,
      bodySnippet: data.bodySnippet,
    };
  } catch (err) {
    return { code, url, error: err.message, schedule: [], ok: false };
  }
}

(async () => {
  console.log('Scraping preset course schedules...');
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  for (const code of PRESET_CODES) {
    console.log(`  ${code}...`);
    const result = await scrapeCourse(page, code);
    results.push(result);
    console.log(`    ${result.ok ? `✓ ${result.schedule.length} sessions` : `✗ ${result.error || 'no schedule found'}`}`);
  }

  await browser.close();

  fs.writeFileSync('preset_schedules_scraped.json', JSON.stringify(results, null, 2));
  console.log(`\nSaved preset_schedules_scraped.json (${results.filter(r => r.ok).length}/${results.length} with schedules)`);

  // Merge into courses.ts
  const code = fs.readFileSync('src/courses.ts', 'utf8');
  const courses = JSON.parse(code.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
  const scrapedByCode = Object.fromEntries(results.map(r => [r.code, r]));

  let updated = 0;
  for (const course of courses) {
    if (course.code === 'Learning contract') continue;
    const scraped = scrapedByCode[course.code];
    if (scraped && scraped.ok && scraped.schedule.length > 0) {
      course.schedule = scraped.schedule;
      updated++;
    }
  }

  const newCode = 'export const COURSES = ' + JSON.stringify(courses, null, 2) + ';\n';
  fs.writeFileSync('src/courses.ts', newCode);
  console.log(`Updated schedules for ${updated} courses in courses.ts`);
})();
