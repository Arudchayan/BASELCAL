const { chromium } = require('playwright');
const fs = require('fs');

const DAY_MAP = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  montag: 'Monday', dienstag: 'Tuesday', mittwoch: 'Wednesday',
  donnerstag: 'Thursday', freitag: 'Friday', samstag: 'Saturday',
};

function parseTimePlace(raw) {
  if (!raw) return [];
  const sessions = [];
  const re = /(\d)(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag),\s*(\d{1,2}\.\d{2}-\d{1,2}\.\d{2})\s+([^wö]+?)(?=wöchentlich|\d(?:Monday|Montag)|$)/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const day = DAY_MAP[m[2].toLowerCase()] || m[2];
    const [start, end] = m[3].split('-').map(s => s.trim().replace('.', ':'));
    sessions.push({
      day,
      time: `${start} - ${end}`,
      room: m[4].trim(),
    });
  }
  if (sessions.length === 0) {
    const simple = /(Monday|Tuesday|Wednesday|Thursday|Friday),\s*(\d{2}:\d{2}-\d{2}:\d{2})/gi;
    let s;
    while ((s = simple.exec(raw)) !== null) {
      const [a, b] = s[2].split('-');
      sessions.push({ day: s[1], time: `${a} - ${b}`, room: 'see VV' });
    }
  }
  return sessions;
}

async function searchCourse(page, code, periode) {
  const url = `https://vorlesungsverzeichnis.unibas.ch/en/course-directory?periode=${periode}&search=1&keyword=${code}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const rows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('table tr'));
    return trs.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      return cells.length >= 7 ? {
        semester: cells[0], no: cells[1], title: cells[3], cp: cells[5], timePlace: cells[6]
      } : null;
    }).filter(Boolean);
  });

  const match = rows.find(r => r.no && r.no.startsWith(code));
  if (!match) return null;
  return {
    code,
    cp: parseInt(match.cp, 10),
    title: match.title,
    schedule: parseTimePlace(match.timePlace),
    raw: match.timePlace,
  };
}

(async () => {
  const code = fs.readFileSync('src/courses.ts', 'utf8');
  const courses = JSON.parse(code.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
  const codes = [...new Set(courses.filter(c => c.code !== 'Learning contract').map(c => c.code))];

  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const results = {};

  const periods = ['202604', '202605']; // HS2026, FS2026
  for (const c of codes) {
    for (const periode of periods) {
      const r = await searchCourse(page, c, periode);
      if (r && r.schedule.length > 0) {
        results[c] = { ...r, periode };
        console.log(`✓ ${c} (${periode}): ${r.schedule.length} sessions`);
        break;
      }
    }
    if (!results[c]) console.log(`✗ ${c}: no schedule found`);
  }

  await browser.close();
  fs.writeFileSync('vv_2026_schedules.json', JSON.stringify(results, null, 2));

  let updated = 0;
  for (const course of courses) {
    if (course.code === 'Learning contract') continue;
    const scraped = results[course.code];
    if (scraped && scraped.schedule.length > 0) {
      course.schedule = scraped.schedule;
      course.url = `https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=${course.code}`;
      updated++;
    }
  }

  fs.writeFileSync('src/courses.ts', 'export const COURSES = ' + JSON.stringify(courses, null, 2) + ';\n');
  console.log(`\nUpdated ${updated} course schedules in courses.ts`);
})();
