const { chromium } = require('playwright');
const fs = require('fs');

const VV = 'https://vorlesungsverzeichnis.unibas.ch/en/course-directory';
const MODULES = [
  { name: 'Mathematical Foundations', objid: 289453 },
  { name: 'Machine Learning Foundations', objid: 289454 },
  { name: 'Systems Foundations', objid: 289455 },
  { name: 'Electives in Data Science', objid: 289456 },
  { name: "Preparation Master's Thesis", objid: 289457 },
];
const PERIODS = ['202604', '202605'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getSearchRows(page, keyword, periode = '') {
  const url = periode
    ? `${VV}?periode=${periode}&search=1&keyword=${encodeURIComponent(keyword)}`
    : `${VV}?search=1&keyword=${encodeURIComponent(keyword)}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1500);
  return page.evaluate(() => {
    return [...document.querySelectorAll('#resultTable tbody tr')]
      .map((tr) => {
        const tds = [...tr.querySelectorAll('td')];
        if (tds.length < 7) return null;
        const titleLink = tds[3].querySelector('a');
        return {
          semester: tds[0].innerText.replace(/\s+/g, ' ').trim(),
          no: tds[1].innerText.trim(),
          format: tds[2].innerText.trim(),
          title: titleLink?.innerText.trim() || tds[3].innerText.trim(),
          detailId: titleLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || null,
          lecturers: tds[4].innerText.trim().replace(/\n/g, ', '),
          cp: parseInt(tds[5].innerText.trim(), 10),
          url: titleLink?.href || null,
        };
      })
      .filter(Boolean);
  });
}

async function getDetail(page, detailId) {
  await page.goto(`${VV}?id=${detailId}`, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1000);
  return page.evaluate(() => {
    const kv = (sel) => {
      const map = {};
      const table = document.querySelector(`${sel} table`);
      if (!table) return map;
      [...table.querySelectorAll('tr')].forEach((tr) => {
        const cells = [...tr.querySelectorAll('th,td')];
        if (cells.length >= 2) map[cells[0].innerText.trim()] = cells[1].innerText.trim();
      });
      return map;
    };
    const modules = [...document.querySelectorAll('a, td, li, span')]
      .map((el) => el.innerText.trim())
      .filter((t) => /Modul:|Module:|Mathematical Foundations|Machine Learning Foundations|Systems Foundations|Electives in Data Science|Preparation Master's Thesis/i.test(t));
    return {
      title: document.querySelector('h2')?.innerText?.trim(),
      event: kv('#event'),
      perf: kv('#perf'),
      cond: kv('#cond'),
      moduleHints: [...new Set(modules)].slice(0, 20),
      bodySnippet: document.body.innerText.slice(0, 2000),
    };
  });
}

async function tryModuleTree(page, objid, periode) {
  const urls = [
    `${VV}?objid=${objid}&periode=${periode}`,
    `https://vorlesungsverzeichnis.unibas.ch/en/semester-planning?objid=${objid}&periode=${periode}`,
    `${VV}?cat=${objid}&periode=${periode}`,
    `${VV}?vv=${objid}&periode=${periode}`,
  ];
  const results = [];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(1200);
    const info = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      heading: document.querySelector('h1,h2,h3')?.innerText || '',
      rowCount: document.querySelectorAll('#resultTable tbody tr').length,
      rows: [...document.querySelectorAll('#resultTable tbody tr')].slice(0, 50).map((tr) => {
        const tds = [...tr.querySelectorAll('td')];
        if (tds.length < 7) return null;
        const titleLink = tds[3].querySelector('a');
        return {
          semester: tds[0].innerText.replace(/\s+/g, ' ').trim(),
          no: tds[1].innerText.trim(),
          title: titleLink?.innerText.trim() || tds[3].innerText.trim(),
          detailId: titleLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || null,
          cp: tds[5].innerText.trim(),
          lecturers: tds[4].innerText.trim().replace(/\n/g, ', '),
          url: titleLink?.href || null,
        };
      }).filter(Boolean),
      treeLinks: [...document.querySelectorAll('a')]
        .filter((a) => /course-directory\?id=\d+/.test(a.href))
        .slice(0, 10)
        .map((a) => ({ text: a.innerText.trim(), href: a.href })),
    }));
    results.push(info);
  }
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const out = { modules: {}, searches: {}, special: {}, localVerify: {} };

  for (const m of MODULES) {
    out.modules[m.name] = {};
    for (const p of PERIODS) {
      out.modules[m.name][p] = await tryModuleTree(page, m.objid, p);
    }
  }

  for (const kw of ['78174', 'From Agents to LLMs', 'Reinforcement Learning', 'Data Science', 'Master Thesis Data Science']) {
    out.searches[kw] = {};
    for (const p of ['', '202604', '202605']) {
      out.searches[kw][p || 'all'] = await getSearchRows(page, kw, p);
    }
  }

  const hits78174 = [
    ...(out.searches['78174'].all || []),
    ...(out.searches['78174']['202604'] || []),
    ...(out.searches['78174']['202605'] || []),
    ...(out.searches['From Agents to LLMs'].all || []),
    ...(out.searches['Reinforcement Learning'].all || []),
  ];
  const unique78174 = new Map();
  for (const h of hits78174) unique78174.set(h.detailId || h.no, h);
  out.special['78174_hits'] = [...unique78174.values()];
  out.special['78174_details'] = {};
  for (const h of out.special['78174_hits'].slice(0, 5)) {
    if (h.detailId) out.special['78174_details'][h.detailId] = await getDetail(page, h.detailId);
  }

  const courses = JSON.parse(
    fs.readFileSync('src/courses.ts', 'utf8').replace('export const COURSES = ', '').replace(/;\s*$/, ''),
  );
  const codes = [...new Set(courses.map((c) => c.code).filter((c) => c !== 'Learning contract'))];
  out.localVerify = { total: codes.length, found2026: {}, notFound: [], byModule: {} };

  for (const course of courses) {
    const mod = course.module || course.type || 'Unknown';
    if (!out.localVerify.byModule[mod]) out.localVerify.byModule[mod] = { total: 0, found: 0, missing: [] };
    out.localVerify.byModule[mod].total += 1;
  }

  for (const code of codes) {
    const rows604 = await getSearchRows(page, code, '202604');
    const rows605 = await getSearchRows(page, code, '202605');
    const rowsAll = rows604.length ? rows604 : rows605.length ? rows605 : await getSearchRows(page, code, '');
    if (rowsAll.length) {
      out.localVerify.found2026[code] = { hs: rows604, fs: rows605, picked: rowsAll[0] };
      const course = courses.find((c) => c.code === code);
      const mod = course?.module || course?.type || 'Unknown';
      if (out.localVerify.byModule[mod]) out.localVerify.byModule[mod].found += 1;
    } else {
      out.localVerify.notFound.push(code);
      const course = courses.find((c) => c.code === code);
      const mod = course?.module || course?.type || 'Unknown';
      if (out.localVerify.byModule[mod]) out.localVerify.byModule[mod].missing.push(code);
    }
  }

  fs.writeFileSync('vv_audit_probe.json', JSON.stringify(out, null, 2));
  console.log('Wrote vv_audit_probe.json');
  console.log('78174 hits:', out.special['78174_hits'].length);
  console.log('notFound:', out.localVerify.notFound.length, out.localVerify.notFound.join(', '));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
