const { chromium } = require('playwright');
const fs = require('fs');

const VV_BASE = 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory';
const PERIODE = { fall2026: '2026004', spring2026: '2025005' };
const DAY_MAP = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function periodeForWhen(when = '') {
  if (/spring/i.test(when)) return [PERIODE.spring2026, PERIODE.fall2026, 'all'];
  if (/fall/i.test(when)) return [PERIODE.fall2026, PERIODE.spring2026, 'all'];
  return ['all', PERIODE.fall2026, PERIODE.spring2026];
}

function titleMatches(course, rowTitle) {
  const t = rowTitle.toLowerCase();
  const id = course.id.toLowerCase();
  if (id.includes('10489-1')) return t.includes('analysis i') && !t.includes('analysis ii');
  if (id.includes('10489-2')) return t.includes('analysis ii');
  return true;
}

function parseKvTable(text) {
  const map = {};
  if (!text) return map;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const key = lines[i];
    if (/^(Semester|Course frequency|Lecturers|Content|Admission requirements|Language of instruction|Use of digital media|Assessment format|Assessment details)$/i.test(key)) {
      map[key] = lines[i + 1];
      i++;
    }
  }
  return map;
}

async function searchCourse(page, code, periode) {
  const url = `${VV_BASE}?periode=${periode}&search=1&keyword=${encodeURIComponent(code)}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1200);
  return page.evaluate((courseCode) => {
    return [...document.querySelectorAll('#resultTable tbody tr')].map((tr) => {
      const tds = [...tr.querySelectorAll('td')];
      if (tds.length < 7) return null;
      const titleLink = tds[3].querySelector('a');
      const no = tds[1].innerText.trim();
      const baseCode = no.split('-')[0];
      if (baseCode !== courseCode) return null;
      return {
        semester: tds[0].innerText.replace(/\s+/g, ' ').trim(),
        no,
        format: tds[2].innerText.trim(),
        title: titleLink?.innerText.trim() || tds[3].innerText.trim(),
        detailId: titleLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || null,
        lecturers: tds[4].innerText.trim().replace(/\n/g, ', '),
        cp: parseInt(tds[5].innerText.trim(), 10),
      };
    }).filter(Boolean);
  }, code);
}

async function fetchDetail(page, detailId) {
  await page.goto(`${VV_BASE}?id=${detailId}`, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1000);
  return page.evaluate(() => {
    const kvFromTable = (root) => {
      const map = {};
      const table = root?.querySelector('table');
      if (!table) return map;
      [...table.querySelectorAll('tr')].forEach((tr) => {
        const cells = [...tr.querySelectorAll('th,td')];
        if (cells.length >= 2) {
          map[cells[0].innerText.trim()] = cells[1].innerText.trim();
        }
      });
      return map;
    };

    const schedule = [];
    const intervalRows = [...document.querySelectorAll('#room .table-interval tbody tr')];
    intervalRows.forEach((tr) => {
      const cells = [...tr.querySelectorAll('td')].map((td) => td.innerText.trim());
      if (cells.length >= 4) {
        const day = cells[1];
        const time = cells[2];
        const room = cells[3];
        if (day && time) {
          const [start, end] = time.split('-').map((s) => s.trim().replace('.', ':'));
          schedule.push({ day, time: `${start} - ${end}`, room: room || 'see VV' });
        }
      }
    });

    const event = kvFromTable(document.querySelector('#event'));
    const cond = kvFromTable(document.querySelector('#cond'));
    const perf = kvFromTable(document.querySelector('#perf'));
    const admission = cond['Admission requirements'] || event['Admission requirements'] || '';

    return {
      event,
      cond,
      perf,
      admission,
      schedule,
      pageTitle: document.querySelector('h2')?.innerText?.trim() || '',
    };
  });
}

async function scrapeOne(page, course) {
  const code = course.code;
  const periods = periodeForWhen(course.when);
  let chosen = null;
  let rows = [];

  for (const periode of periods) {
    rows = await searchCourse(page, code, periode);
    const filtered = rows.filter((r) => titleMatches(course, r.title));
    if (filtered.length) {
      chosen = filtered[0];
      break;
    }
    if (rows.length && !chosen) chosen = rows[0];
  }

  if (!chosen?.detailId) {
    return { code, id: course.id, status: 'not_found', rows: rows.length };
  }

  const detail = await fetchDetail(page, chosen.detailId);
  const lang = detail.cond['Language of instruction'] || course.lang;
  const exam = detail.perf['Assessment format']
    ? `${detail.perf['Assessment format']}${detail.perf['Assessment details'] ? ` — ${detail.perf['Assessment details']}` : ''}`
    : course.exam;

  return {
    code,
    id: course.id,
    status: 'ok',
    vvId: chosen.detailId,
    url: `${VV_BASE}?id=${chosen.detailId}`,
    title: chosen.title,
    cp: chosen.cp,
    semester: chosen.semester,
    format: chosen.format,
    lecturers: chosen.lecturers || detail.event.Lecturers || course.lecturer,
    description: detail.event.Content || course.description,
    prerequisites: detail.admission || course.prerequisites,
    exam,
    lang,
    frequency: detail.event['Course frequency'] || course.when,
    schedule: detail.schedule,
  };
}

const PRESERVE_CP_IDS = new Set(['AD-10489-1', 'AD-10489-2']);

function applyScrape(courses, scrapedById) {
  let updated = 0;
  for (const course of courses) {
    const data = scrapedById[course.id];
    if (!data || data.status !== 'ok') continue;
    course.url = data.url;
    if (data.title) course.title = data.title.trim();
    if (Number.isFinite(data.cp) && !PRESERVE_CP_IDS.has(course.id)) course.cp = data.cp;
    if (data.description) course.description = data.description;
    if (data.prerequisites) course.prerequisites = data.prerequisites;
    if (data.exam) course.exam = data.exam;
    if (data.lecturers) course.lecturer = data.lecturers.split(',')[0].trim();
    if (data.lang) course.lang = data.lang;
    if (data.frequency) course.when = data.frequency;
    if (data.schedule?.length) course.schedule = data.schedule;
    updated++;
  }
  return updated;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const limit = parseInt(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

  const coursesCode = fs.readFileSync('src/courses.ts', 'utf8');
  const courses = JSON.parse(coursesCode.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
  const targets = courses.filter((c) => c.code !== 'Learning contract');
  const slice = limit > 0 ? targets.slice(0, limit) : targets;

  const cachePath = 'vv_scrape_cache.json';
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();

  let ok = 0;
  let miss = 0;

  for (let i = 0; i < slice.length; i++) {
    const course = slice[i];
    if (cache[course.id]?.status === 'ok' && !process.argv.includes('--refresh')) {
      ok++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${slice.length}] ${course.id} (${course.code})... `);
    try {
      const result = await scrapeOne(page, course);
      cache[course.id] = result;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      if (result.status === 'ok') {
        ok++;
        console.log(`ok (${result.schedule?.length || 0} sessions, ${result.cp} CP)`);
      } else {
        miss++;
        console.log('not found');
      }
    } catch (err) {
      miss++;
      cache[course.id] = { id: course.id, code: course.code, status: 'error', error: String(err) };
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      console.log(`error: ${err.message}`);
    }
    await sleep(400);
  }

  await browser.close();

  console.log(`\nScrape complete: ${ok} ok, ${miss} missing/errors, cache -> ${cachePath}`);

  if (apply) {
    const count = applyScrape(courses, cache);
    const out = `export const COURSES = ${JSON.stringify(courses, null, 2)};\n`;
    fs.writeFileSync('src/courses.ts', out);
    console.log(`Applied ${count} course updates to src/courses.ts`);
  }
})();
