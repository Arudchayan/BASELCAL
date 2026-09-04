const { chromium } = require('playwright');
const fs = require('fs');

const policy = JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8'));
const period = policy.academicPeriod.fall;
const rootId = policy.moduleObjids.root;
const baseUrl = 'https://vorlesungsverzeichnis.unibas.ch/en/semester-program';

const moduleNames = [
  'Mathematical Foundations',
  'Machine Learning Foundations',
  'Systems Foundations',
  'Electives in Data Science',
  "Preparation Master's Thesis",
];

const waitForTree = () => new Promise((resolve) => setTimeout(resolve, 700));

async function treeItemForLabel(page, label) {
  return page.getByRole('treeitem').filter({ hasText: label }).last();
}

async function expandTreeItem(page, label) {
  const item = await treeItemForLabel(page, label);
  if ((await item.getAttribute('aria-expanded')) === 'true') return item;
  const button = item.getByRole('button').first();
  if (await button.count()) {
    await button.click();
    await waitForTree();
  }
  return item;
}

function parseCourse(text, href) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(\d+)-(\d+) - ([^:]+): (.*?) \((\d+) CP\)(.*)$/);
  if (!match) return { text: normalized, vvId: href?.match(/[?&]id=(\d+)/)?.[1] || null };
  return {
    code: match[1],
    section: match[2],
    format: match[3],
    title: match[4],
    cp: Number(match[5]),
    scheduleSummary: match[6].trim() || null,
    vvId: href?.match(/[?&]id=(\d+)/)?.[1] || null,
  };
}

function firstLecturer(value) {
  return value?.split('\n')[0].split(' (')[0].trim() || null;
}

function applyManifestToCatalog(manifest) {
  const catalogPath = 'src/courses.ts';
  const source = fs.readFileSync(catalogPath, 'utf8');
  const courses = JSON.parse(source.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
  const entries = Object.values(manifest.modules).flat().filter((entry) => entry.code);
  const entriesByCode = new Map();
  for (const entry of entries) {
    if (!entriesByCode.has(entry.code)) entriesByCode.set(entry.code, []);
    entriesByCode.get(entry.code).push(entry);
  }

  let updated = 0;
  for (const course of courses) {
    const matches = entriesByCode.get(course.code);
    if (!matches) continue;
    const primary = matches.find((entry) => manifest.modules[course.module]?.includes(entry)) || matches[0];
    const detail = manifest.details[primary.vvId] || {};
    const schedules = matches
      .flatMap((entry) => manifest.details[entry.vvId]?.schedule || [])
      .filter((session, index, all) =>
        all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(session)) === index,
      );

    course.title = primary.title;
    course.cp = primary.cp;
    course.url = `https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=${primary.vvId}`;
    if (detail.frequency) course.when = detail.frequency;
    if (detail.language) course.lang = detail.language;
    if (detail.description) course.description = detail.description;
    if (detail.prerequisites) course.prerequisites = detail.prerequisites;
    if (detail.exam && !/XX\.XX\.XXXX/i.test(detail.exam)) course.exam = detail.exam;
    if (firstLecturer(detail.lecturers)) course.lecturer = firstLecturer(detail.lecturers);
    if (schedules.length) course.schedule = schedules;
    updated++;
  }

  const additions = {
    '41828': {
      priority: 'Low',
      note: 'Official Fall 2026 elective; sustainability and food-system focus.',
      syllabus: [
        'Analyze food-system sustainability problems from a natural-science perspective.',
        'Evaluate ecosystem, biodiversity, land-use, and resource impacts of food production.',
        'Apply course concepts in empirical case-study work.',
      ],
    },
    '41829': {
      priority: 'Low',
      note: 'Official Fall 2026 elective; social-science and food-system focus.',
      syllabus: [
        'Analyze food-system sustainability problems from social-science perspectives.',
        'Evaluate governance, health, producer-income, and societal transformation questions.',
        'Apply course concepts to a food-product value-chain project.',
      ],
    },
    '76636': {
      priority: 'Low',
      note: 'Practical companion to Quantum Computation and Error Correction.',
      syllabus: [
        'Apply quantum-computing and error-correction concepts in practical exercises.',
        'Gain hands-on experience with quantum-computing tools.',
      ],
    },
  };

  let added = 0;
  for (const [code, defaults] of Object.entries(additions)) {
    if (courses.some((course) => course.code === code)) continue;
    const matches = entriesByCode.get(code);
    if (!matches?.length) continue;
    const primary = matches[0];
    const detail = manifest.details[primary.vvId] || {};
    courses.push({
      id: `E-${code}`,
      code,
      title: primary.title,
      cp: primary.cp,
      module: 'Electives in Data Science',
      when: detail.frequency || 'Fall 2026',
      lang: detail.language || 'English',
      priority: defaults.priority,
      type: 'Elective',
      note: defaults.note,
      url: `https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=${primary.vvId}`,
      description: detail.description || `Practical course associated with ${primary.title}. See the official course directory for details.`,
      prerequisites: detail.prerequisites || 'See the official course directory and associated lecture requirements.',
      exam: detail.exam || 'See the official course directory.',
      lecturer: firstLecturer(detail.lecturers) || 'See VV',
      syllabus: defaults.syllabus,
      schedule: detail.schedule || [],
    });
    added++;
  }

  fs.writeFileSync(catalogPath, `export const COURSES = ${JSON.stringify(courses, null, 2)};\n`);
  console.log(`Applied Fall 2026 manifest to ${updated} existing courses; added ${added} courses`);
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
    const schedule = [...document.querySelectorAll('#room .table-interval tbody tr')]
      .map((row) => {
        const cells = [...row.querySelectorAll('td')].map((cell) => cell.innerText.trim());
        if (cells.length < 4 || !cells[1] || !cells[2]) return null;
        const [start, end] = cells[2].split('-').map((value) => value.trim().replace('.', ':'));
        return { day: cells[1], time: `${start} - ${end}`, room: cells[3] || 'see VV' };
      })
      .filter(Boolean);
    return {
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

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const url = `${baseUrl}?periode=${period}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  const programLabel = "Master's Studies: Data Science";
  await page.getByRole('searchbox', { name: 'Search' }).last().fill(programLabel);
  await page.getByRole('option', { name: programLabel, exact: true }).last().click();
  await page.waitForURL((current) => current.searchParams.get('hid') === String(rootId), { timeout: 30000 });
  await waitForTree();

  await expandTreeItem(page, 'Faculty of Science');
  await expandTreeItem(page, programLabel);

  const modules = {};
  for (const moduleName of moduleNames) {
    const label = `Module: ${moduleName}`;
    const item = await expandTreeItem(page, label);
    const children = item.locator(':scope > [role="group"] > [role="treeitem"]');
    const entries = [];
    for (let i = 0; i < (await children.count()); i++) {
      const child = children.nth(i);
      const text = (await child.innerText()).trim();
      const href = await child.locator('a[href*="id="]').first().getAttribute('href').catch(() => null);
      entries.push(parseCourse(text, href));
    }
    modules[moduleName] = entries;
  }

  const byCode = {};
  for (const [moduleName, entries] of Object.entries(modules)) {
    for (const entry of entries) {
      if (!entry.code) continue;
      byCode[entry.code] ||= [];
      if (!byCode[entry.code].includes(moduleName)) byCode[entry.code].push(moduleName);
    }
  }

  const details = {};
  const vvIds = [...new Set(Object.values(modules).flat().map((entry) => entry.vvId).filter(Boolean))];
  for (const vvId of vvIds) {
    details[vvId] = await fetchCourseDetail(page, vvId);
  }

  const bodyText = await page.locator('body').innerText();
  const siteUpdated = bodyText.match(/Last Update:\s*([^\n]+)/i)?.[1]?.trim() || null;
  const manifest = {
    version: 1,
    period,
    periodLabel: policy.academicPeriod.fallLabel,
    fetchedAt: new Date().toISOString(),
    siteUpdated,
    source: page.url(),
    modules,
    details,
    crossListedCourses: Object.fromEntries(Object.entries(byCode).filter(([, names]) => names.length > 1)),
  };

  fs.writeFileSync('vv_module_manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  const count = Object.values(modules).reduce((sum, entries) => sum + entries.length, 0);
  console.log(`Wrote vv_module_manifest.json with ${count} module entries`);
  if (process.argv.includes('--apply')) applyManifestToCatalog(manifest);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
