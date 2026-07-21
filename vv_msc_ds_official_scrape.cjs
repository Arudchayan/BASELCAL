const { chromium } = require('playwright');
const fs = require('fs');

const VV = 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory';
const policy = JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8'));
const PERIODE_FALL = policy.academicPeriod.fall;
const PERIODE_SPRING = policy.academicPeriod.spring;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clickTab(page, label) {
  const link = page.locator('a, button, li').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
  if (await link.count()) {
    await link.click();
    await sleep(800);
    return true;
  }
  return false;
}

async function fetchCourseDetail(page, id) {
  await page.goto(`${VV}?id=${id}`, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1000);
  const base = await page.evaluate(() => {
    const kv = (root) => {
      const map = {};
      const table = root?.querySelector('table');
      if (!table) return map;
      [...table.querySelectorAll('tr')].forEach((tr) => {
        const cells = [...tr.querySelectorAll('th,td')];
        if (cells.length >= 2) map[cells[0].innerText.trim()] = cells[1].innerText.trim();
      });
      return map;
    };
    const h2 = document.querySelector('h2')?.innerText?.trim() || '';
    const codeMatch = h2.match(/^(\d+)/);
    return {
      h2,
      code: codeMatch ? codeMatch[1] : null,
      event: kv(document.querySelector('#event')),
      perf: kv(document.querySelector('#perf')),
      cond: kv(document.querySelector('#cond')),
      description: document.querySelector('#desc')?.innerText?.trim() || '',
    };
  });

  await clickTab(page, 'Modules');
  const modules = await page.evaluate(() => document.querySelector('#mod')?.innerText?.trim() || document.body.innerText.match(/Modul:[\s\S]{0,500}/)?.[0] || '');

  await clickTab(page, 'Admission Requirements');
  const admission = await page.evaluate(() => document.querySelector('#zul')?.innerText?.trim() || document.querySelector('#cond')?.innerText?.trim() || '');

  return { ...base, modules, admission, url: `${VV}?id=${id}` };
}

async function searchByCode(page, code) {
  for (const periode of [PERIODE_FALL, PERIODE_SPRING, '']) {
    const url = periode
      ? `${VV}?periode=${periode}&search=1&keyword=${encodeURIComponent(code)}`
      : `${VV}?search=1&keyword=${encodeURIComponent(code)}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(2000);
    const rows = await page.evaluate((courseCode) => {
      return [...document.querySelectorAll('#resultTable tbody tr')]
        .map((tr) => {
          const tds = [...tr.querySelectorAll('td')];
          if (tds.length < 7) return null;
          const titleLink = tds[3].querySelector('a');
          const no = tds[1].innerText.trim();
          if (!no.startsWith(courseCode)) return null;
          return {
            semester: tds[0].innerText.replace(/\s+/g, ' ').trim(),
            no,
            format: tds[2].innerText.trim(),
            title: titleLink?.innerText.trim() || tds[3].innerText.trim(),
            detailId: titleLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || null,
            lecturers: tds[4].innerText.trim().replace(/\n/g, ', '),
            cp: parseInt(tds[5].innerText.trim(), 10),
            url: titleLink?.href || null,
          };
        })
        .filter(Boolean);
    }, code);
    if (rows.length) return { periode: periode || 'all', rows };
  }
  return { periode: null, rows: [] };
}

async function exploreSemesterPlanningTree(page) {
  await page.goto(`https://vorlesungsverzeichnis.unibas.ch/en/semester-planning?periode=${PERIODE_FALL}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await sleep(2000);

  const treeApi = await page.evaluate(async (periode) => {
    const res = await fetch(`/en/semester-planning/tree?periode=${periode}`);
    if (!res.ok) return { error: res.status };
    return res.json();
  }, PERIODE_FALL).catch(() => null);

  return { treeApiSample: treeApi ? 'loaded' : 'failed', url: page.url() };
}

(async () => {
  const cache = JSON.parse(fs.readFileSync('vv_scrape_cache.json', 'utf8'));
  const courses = JSON.parse(
    fs.readFileSync('src/courses.ts', 'utf8').replace('export const COURSES = ', '').replace(/;\s*$/, ''),
  );

  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const out = {
    scrapedAt: new Date().toISOString(),
    navigation: {
      entry: 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory',
      mscDsTree: 'Philosophisch-Naturwissenschaftliche Fakultät > Masterstudium: Data Science (objid 289451)',
      modules: [
        { name: 'Mathematical Foundations', objid: 289453 },
        { name: 'Machine Learning Foundations', objid: 289454 },
        { name: 'Systems Foundations', objid: 289455 },
        { name: 'Electives in Data Science', objid: 289456 },
        { name: "Preparation Master's Thesis", objid: 289457 },
      ],
      note: 'Module objid URLs return empty result tables; use detail?id= or keyword search instead.',
    },
    courses: [],
    searchChecks: {},
    treeProbe: await exploreSemesterPlanningTree(page),
  };

  const ids = Object.values(cache)
    .filter((c) => c.status === 'ok' && c.vvId)
    .map((c) => ({ id: c.id, code: c.code, vvId: c.vvId, localModule: courses.find((x) => x.id === c.id)?.module }));

  for (const item of ids) {
    const detail = await fetchCourseDetail(page, item.vvId);
    const search = await searchByCode(page, item.code);
    out.courses.push({
      localId: item.id,
      localModule: item.localModule,
      code: item.code,
      vvId: item.vvId,
      title: detail.h2.replace(/^\d+-?\d*\s*-\s*/, '').replace(/\s*\(\d+\s*CP\)$/, '').trim(),
      cp: parseInt(detail.h2.match(/\((\d+)\s*CP\)/)?.[1] || detail.event['CP'] || '0', 10) || cache[item.id]?.cp,
      semester: detail.event.Semester || cache[item.id]?.semester,
      frequency: detail.event['Course frequency'] || cache[item.id]?.frequency,
      lecturers: detail.event.Lecturers || cache[item.id]?.lecturers,
      exam: [detail.perf['Assessment format'], detail.perf['Assessment details']].filter(Boolean).join(' — '),
      language: detail.cond['Language of instruction'] || cache[item.id]?.lang,
      modulesTab: detail.modules,
      admission: detail.admission,
      url: detail.url,
      searchHit: search.rows[0] || null,
    });
    process.stdout.write('.');
  }

  for (const kw of ['78174', 'Reinforcement Learning', 'From Agents to LLMs']) {
    out.searchChecks[kw] = await searchByCode(page, kw.includes('781') ? '78174' : kw);
    if (kw !== '78174') {
      await page.goto(`${VV}?search=1&keyword=${encodeURIComponent(kw)}`, { waitUntil: 'networkidle' });
      await sleep(2000);
      out.searchChecks[kw] = await page.evaluate(() =>
        [...document.querySelectorAll('#resultTable tbody tr')].slice(0, 10).map((tr) => {
          const tds = [...tr.querySelectorAll('td')];
          return tds[3]?.innerText?.trim();
        }),
      );
    }
  }

  fs.writeFileSync('vv_msc_ds_official.json', JSON.stringify(out, null, 2));
  console.log('\nWrote vv_msc_ds_official.json with', out.courses.length, 'courses');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
