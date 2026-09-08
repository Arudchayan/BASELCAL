/**
 * Refresh title/CP/lecturer/exam/language/schedule for every catalog course
 * that has a VV detail id. Skips synthetic learning-contract / thesis rows.
 *
 *   npm run audit:catalog     # write vv_catalog_details.json
 *   npm run refresh:catalog   # also apply into src/courses.ts
 */
const { chromium } = require('playwright');
const fs = require('fs');

const policy = JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8'));
const synthetic = new Set(policy.syntheticIds || []);
const APPLY = process.argv.includes('--apply');

function loadCourses() {
  const source = fs.readFileSync('src/courses.ts', 'utf8');
  return JSON.parse(source.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
}

function vvIdFromUrl(url) {
  return String(url || '').match(/[?&]id=(\d+)/)?.[1] || null;
}

function firstLecturer(value) {
  return value?.split('\n')[0].split(' (')[0].trim() || null;
}

function normTime(value) {
  return String(value || '')
    .replace(/\./g, ':')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sessionKey(session) {
  return `${session.day || ''}|${normTime(session.time)}|${String(session.room || '').replace(/\s+/g, ' ').trim()}`;
}

function catalogSessionsAreSelectedGroup(catalog, official) {
  if (!catalog?.length || !official?.length) return false;
  const officialKeys = new Set(official.map(sessionKey));
  return catalog.every((session) => officialKeys.has(sessionKey(session)));
}

async function fetchCourseDetail(page, vvId) {
  await page.goto(`https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=${vvId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  return page.evaluate(() => {
    const tableValues = (root) => {
      const values = {};
      for (const row of root?.querySelectorAll('tr') || []) {
        const cells = [...row.querySelectorAll('th,td')];
        if (cells.length >= 2) values[cells[0].innerText.trim()] = cells[1].innerText.trim();
      }
      return values;
    };
    const event = tableValues(document.querySelector('#event'));
    const conditions = tableValues(document.querySelector('#cond'));
    const performance = tableValues(document.querySelector('#perf'));
    const heading = document.querySelector('h1, h2')?.innerText?.trim() || '';
    const schedule = [...document.querySelectorAll('#room .table-interval tbody tr')]
      .map((row) => {
        const cells = [...row.querySelectorAll('td')].map((cell) => cell.innerText.trim());
        if (cells.length < 4 || !cells[1] || !cells[2]) return null;
        const [start, end] = cells[2].split('-').map((value) => value.trim().replace('.', ':'));
        return { day: cells[1], time: `${start} - ${end}`, room: cells[3] || 'see VV' };
      })
      .filter(Boolean);
    return {
      heading,
      frequency: event['Course frequency'] || null,
      lecturers: event.Lecturers || null,
      description: document.querySelector('#desc')?.innerText?.trim() || event.Content || null,
      prerequisites: conditions['Admission requirements'] || event['Admission requirements'] || null,
      language: conditions['Language of instruction'] || null,
      exam: [performance['Assessment format'], performance['Assessment details']].filter(Boolean).join(' — ') || null,
      schedule,
    };
  });
}

function applyDetails(courses, detailsById) {
  let updated = 0;
  let keptGroup = 0;
  for (const course of courses) {
    const vvId = vvIdFromUrl(course.url);
    const detail = vvId && detailsById[vvId];
    if (!detail || detail.error) continue;

    if (detail.frequency) course.when = detail.frequency;
    if (detail.language) course.lang = detail.language;
    if (detail.description) course.description = detail.description;
    if (detail.prerequisites) course.prerequisites = detail.prerequisites;
    if (detail.exam && !/XX\.XX\.XXXX/i.test(detail.exam)) course.exam = detail.exam;
    if (firstLecturer(detail.lecturers)) course.lecturer = firstLecturer(detail.lecturers);

    const official = detail.schedule || [];
    const catalog = course.schedule || [];
    if (official.length) {
      if (catalog.length && catalogSessionsAreSelectedGroup(catalog, official) && catalog.length < official.length) {
        keptGroup += 1;
      } else {
        course.schedule = official;
      }
    }
    updated += 1;
  }
  return { updated, keptGroup };
}

(async () => {
  const courses = loadCourses();
  const targets = courses
    .map((course) => ({ course, vvId: vvIdFromUrl(course.url) }))
    .filter(({ course, vvId }) => vvId && !synthetic.has(course.id));

  console.log(`Fetching ${targets.length} VV detail pages…`);
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const detailsById = {};
  let ok = 0;
  let failed = 0;

  for (const { course, vvId } of targets) {
    try {
      detailsById[vvId] = await fetchCourseDetail(page, vvId);
      ok += 1;
      process.stdout.write('.');
    } catch (error) {
      detailsById[vvId] = { error: String(error.message || error) };
      failed += 1;
      process.stdout.write('x');
    }
  }
  process.stdout.write('\n');
  await browser.close();

  const snapshot = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    source: 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory',
    count: targets.length,
    ok,
    failed,
    details: detailsById,
  };
  fs.writeFileSync('vv_catalog_details.json', `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote vv_catalog_details.json (${ok} ok, ${failed} failed)`);

  if (APPLY) {
    const { updated, keptGroup } = applyDetails(courses, detailsById);
    fs.writeFileSync('src/courses.ts', `export const COURSES = ${JSON.stringify(courses, null, 2)};\n`);
    console.log(`Applied live details to ${updated} catalog courses (kept ${keptGroup} selected practical group(s))`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
