const { chromium } = require('playwright');

const DAY_MAP = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

function parseTimeCell(html) {
  const sessions = [];
  const re = /(\d)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s*(\d{1,2}\.\d{2}-\d{1,2}\.\d{2})\s*([\s\S]*?)(?=(?:\d(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)|$))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const day = DAY_MAP[m[2].toLowerCase()] || m[2];
    const [start, end] = m[3].split('-').map((s) => s.trim().replace('.', ':'));
    const roomMatch = m[4].match(/>([^<]+)</);
    const room = roomMatch ? roomMatch[1].trim() : m[4].replace(/\s+/g, ' ').trim();
    sessions.push({ day, time: `${start} - ${end}`, room });
  }
  return sessions;
}

function parseIntervalTable(pageText) {
  const sessions = [];
  const rows = pageText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < rows.length; i++) {
    const day = rows[i];
    if (!DAY_MAP[day.toLowerCase()]) continue;
    const time = rows[i + 1];
    const room = rows[i + 2];
    if (time && /\d\.\d{2}-\d/.test(time)) {
      const [start, end] = time.split('-').map((s) => s.trim().replace('.', ':'));
      sessions.push({
        day: DAY_MAP[day.toLowerCase()],
        time: `${start} - ${end}`,
        room: room && !room.includes('wöchentlich') ? room : 'see VV',
      });
    }
  }
  return sessions;
}

function tableToMap(text) {
  const map = {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const key = lines[i];
    if (['Semester', 'Course frequency', 'Lecturers', 'Content', 'Admission requirements', 'Language of instruction', 'Assessment format', 'Assessment details'].includes(key)) {
      map[key] = lines[i + 1];
      i++;
    }
  }
  return map;
}

async function searchRows(page, code) {
  const url = `https://vorlesungsverzeichnis.unibas.ch/en/course-directory?search=1&keyword=${code}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  return page.evaluate((courseCode) => {
    const rows = [...document.querySelectorAll('#resultTable tbody tr')];
    return rows.map((tr) => {
      const tds = [...tr.querySelectorAll('td')];
      if (tds.length < 7) return null;
      const semester = tds[0].innerText.replace(/\s+/g, ' ').trim();
      const semesterCode = tds[0].querySelector('font')?.innerText?.trim() || '';
      const no = tds[1].innerText.trim();
      const format = tds[2].innerText.trim();
      const titleLink = tds[3].querySelector('a');
      const title = titleLink?.innerText.trim() || tds[3].innerText.trim();
      const detailId = titleLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || null;
      const lecturers = tds[4].innerText.trim().replace(/\n/g, ', ');
      const cp = parseInt(tds[5].innerText.trim(), 10);
      const timeHtml = tds[6].innerHTML;
      const timeText = tds[6].innerText.trim();
      const baseCode = no.split('-')[0];
      if (baseCode !== courseCode) return null;
      return { semester, semesterCode, no, format, title, detailId, lecturers, cp, timeHtml, timeText };
    }).filter(Boolean);
  }, code);
}

async function fetchDetail(page, detailId) {
  await page.goto(`https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=${detailId}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const getPane = (id) => document.querySelector(`#${id}`)?.innerText?.trim() || '';
    const eventTable = document.querySelector('#event table')?.innerText?.trim() || '';
    const intervalTable = document.querySelector('#room .table-interval')?.innerText?.trim() || '';
    const condTable = document.querySelector('#cond table')?.innerText?.trim() || '';
    const perfTable = document.querySelector('#perf table')?.innerText?.trim() || '';
    const admission = document.querySelector('#zul')?.innerText?.trim() || '';
    return { eventTable, intervalTable, condTable, perfTable, admission };
  });
}

function pickRow(rows, when) {
  if (!rows.length) return null;
  const wantSpring = /spring/i.test(when);
  const wantFall = /fall/i.test(when);
  if (wantSpring) {
    const spring = rows.find((r) => /spring|fs 202/i.test(r.semester));
    if (spring) return spring;
  }
  if (wantFall) {
    const fall = rows.find((r) => /fall|hs 202/i.test(r.semester));
    if (fall) return fall;
  }
  return rows[0];
}

(async () => {
  const code = process.argv[2] || '66096';
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const rows = await searchRows(page, code);
  console.log('rows', rows.length, rows);
  const row = rows[0];
  if (row?.detailId) {
    const detail = await fetchDetail(page, row.detailId);
    console.log('detail keys', Object.keys(detail));
    console.log('interval', detail.intervalTable);
    console.log('event map', tableToMap(detail.eventTable));
    console.log('schedule from search', parseTimeCell(row.timeHtml));
    console.log('schedule from detail', parseIntervalTable(detail.intervalTable));
  }
  await browser.close();
})();
