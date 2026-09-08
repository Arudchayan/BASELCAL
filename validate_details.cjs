/**
 * Validate catalog title, CP, lecturer, language, times and rooms
 * against vv_module_manifest.json (offline) or live VV (--live).
 *
 *   npm run validate:details
 *   npm run validate:details:live
 *   node validate_details.cjs --plan   # example outline + student overlay only
 */
const fs = require('fs');
const path = require('path');

const LIVE = process.argv.includes('--live');
const PLAN_ONLY = process.argv.includes('--plan');
const issues = [];
const warnings = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { issues.push(msg); console.log(`  ✗ ${msg}`); };
const warn = (msg) => { warnings.push(msg); console.log(`  ⚠ ${msg}`); };

const policy = JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8'));
const synthetic = new Set(policy.syntheticIds || []);
const preserveCp = new Set(policy.preserveCpIds || []);
const staleWatch = new Set(policy.staleWatchIds || []);

function loadCourses() {
  const source = fs.readFileSync('src/courses.ts', 'utf8');
  return JSON.parse(source.replace('export const COURSES = ', '').replace(/ as const/g, '').replace(/;\s*$/, ''));
}

function vvIdFromUrl(url) {
  const match = String(url || '').match(/[?&]id=(\d+)/);
  return match ? match[1] : null;
}

function firstLecturer(value) {
  return value?.split('\n')[0].split(' (')[0].trim() || '';
}

function normTime(value) {
  return String(value || '')
    .replace(/\./g, ':')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normRoom(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sessionKey(session) {
  return `${session.day || ''}|${normTime(session.time)}|${normRoom(session.room)}`;
}

function sessionLabel(session) {
  return `${session.day} ${normTime(session.time)} @ ${normRoom(session.room)}`;
}

function refId(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && typeof item.id === 'string') return item.id;
  return '';
}

function loadPlanIds() {
  const ids = new Set();
  if (fs.existsSync('src/examplePlan.json')) {
    const example = JSON.parse(fs.readFileSync('src/examplePlan.json', 'utf8'));
    for (const list of Object.values(example.plan || {})) {
      for (const item of list || []) ids.add(refId(item));
    }
  }
  const localPath = path.join('config', 'student.local.json');
  if (fs.existsSync(localPath)) {
    const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    for (const list of Object.values(local.plan || {})) {
      for (const item of list || []) ids.add(refId(item));
    }
  }
  if (process.env.STUDENT_CONFIG) {
    try {
      const env = JSON.parse(process.env.STUDENT_CONFIG);
      for (const list of Object.values(env.plan || {})) {
        for (const item of list || []) ids.add(refId(item));
      }
    } catch {
      warn('STUDENT_CONFIG is not valid JSON — ignored for --plan filter');
    }
  }
  ids.delete('');
  return ids;
}

function collectOfficialSessions(code, vvId, manifest) {
  const entries = Object.values(manifest.modules || {})
    .flat()
    .filter((entry) => entry.code === code || entry.vvId === vvId);
  const sessions = [];
  const seen = new Set();
  for (const entry of entries) {
    for (const session of manifest.details?.[entry.vvId]?.schedule || []) {
      const key = sessionKey(session);
      if (seen.has(key)) continue;
      seen.add(key);
      sessions.push(session);
    }
  }
  if (!sessions.length && vvId && manifest.details?.[vvId]?.schedule) {
    return manifest.details[vvId].schedule;
  }
  return sessions;
}

function officialForCourse(course, manifest) {
  const vvId = vvIdFromUrl(course.url);
  const entries = Object.values(manifest.modules || {})
    .flat()
    .filter((entry) => entry.code === course.code || entry.vvId === vvId);
  const primary = entries.find((entry) => entry.vvId === vvId) || entries[0];
  const detail = (vvId && manifest.details?.[vvId]) || (primary && manifest.details?.[primary.vvId]) || null;
  return {
    vvId,
    primary,
    detail,
    sessions: collectOfficialSessions(course.code, vvId, manifest),
  };
}

async function fetchLiveDetails(vvIds) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, args: ['--disable-http2'] });
  const page = await browser.newPage();
  const details = {};
  for (const vvId of vvIds) {
    await page.goto(`https://vorlesungsverzeichnis.unibas.ch/en/course-directory?id=${vvId}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    details[vvId] = await page.evaluate(() => {
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
        language: conditions['Language of instruction'] || null,
        title: document.querySelector('h1, .page-header h1, title')?.innerText?.trim() || null,
        schedule,
      };
    });
    console.log(`  · live ${vvId}`);
  }
  await browser.close();
  return details;
}

(async () => {
  console.log('=== COURSE DETAIL VALIDATION ===\n');
  if (!fs.existsSync('vv_module_manifest.json')) {
    fail('vv_module_manifest.json is missing — run npm run audit:modules');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync('vv_module_manifest.json', 'utf8'));
  if (fs.existsSync('vv_catalog_details.json')) {
    const catalogSnap = JSON.parse(fs.readFileSync('vv_catalog_details.json', 'utf8'));
    manifest.details = { ...(catalogSnap.details || {}), ...(manifest.details || {}) };
    pass(`Catalog detail snapshot ${String(catalogSnap.fetchedAt || '').slice(0, 10)} (${catalogSnap.ok || 0} pages)`);
  }
  const courses = loadCourses();
  const planIds = PLAN_ONLY ? loadPlanIds() : null;
  const targets = courses.filter((course) => {
    if (synthetic.has(course.id)) return false;
    if (PLAN_ONLY && planIds.size && !planIds.has(course.id)) return false;
    return true;
  });

  pass(`Manifest ${manifest.periodLabel || manifest.period} fetched ${String(manifest.fetchedAt || '').slice(0, 10)}`);
  console.log(`  Checking ${targets.length} catalog courses${PLAN_ONLY ? ' (plan/example only)' : ''}${LIVE ? ' against live VV' : ' against saved manifest'}`);

  if (LIVE) {
    const vvIds = [...new Set(targets.map((course) => vvIdFromUrl(course.url)).filter(Boolean))];
    const live = await fetchLiveDetails(vvIds);
    manifest.details = { ...manifest.details, ...live };
  }

  let compared = 0;
  let scheduled = 0;
  let noOfficial = 0;

  for (const course of targets) {
    const official = officialForCourse(course, manifest);
    if (!official.primary && !official.detail) {
      noOfficial += 1;
      if (PLAN_ONLY && !staleWatch.has(course.id) && course.type !== 'Admission') {
        warn(`${course.id}: planned course has no Fall 2026 VV snapshot — treat times/rooms as provisional`);
      }
      continue;
    }
    compared += 1;

    if (official.primary && course.title !== official.primary.title) {
      fail(`${course.id} title "${course.title}" != VV "${official.primary.title}"`);
    }
    if (official.primary && !preserveCp.has(course.id) && course.cp !== official.primary.cp) {
      fail(`${course.id} CP ${course.cp} != VV ${official.primary.cp}`);
    }
    if (official.detail?.language && course.lang && course.lang !== official.detail.language) {
      warn(`${course.id} language "${course.lang}" vs VV "${official.detail.language}"`);
    }
    const vvLecturer = firstLecturer(official.detail?.lecturers);
    if (vvLecturer && course.lecturer && course.lecturer !== vvLecturer && !course.lecturer.startsWith(vvLecturer.split(' ')[0])) {
      warn(`${course.id} lecturer "${course.lecturer}" vs VV "${vvLecturer}"`);
    }

    const catalogSessions = course.schedule || [];
    const officialSessions = official.sessions || [];
    const officialKeys = new Set(officialSessions.map(sessionKey));
    const catalogKeys = new Set(catalogSessions.map(sessionKey));

    if (catalogSessions.length) scheduled += 1;

    const missing = catalogSessions.filter((session) => !officialKeys.has(sessionKey(session)));
    if (missing.length) {
      fail(
        `${course.id} has ${missing.length} catalog slot(s) not in VV: ${missing.map(sessionLabel).join('; ')}`,
      );
    }

    const extra = officialSessions.filter((session) => !catalogKeys.has(sessionKey(session)));
    if (extra.length && catalogSessions.length) {
      warn(
        `${course.id} VV has ${extra.length} extra slot(s) not in catalog (other groups?): ${extra.slice(0, 3).map(sessionLabel).join('; ')}${extra.length > 3 ? '…' : ''}`,
      );
    }

    if (!catalogSessions.length && officialSessions.length && course.type !== 'Admission') {
      const contract = /learning contract/i.test(course.when || '');
      if (!contract && !staleWatch.has(course.id)) {
        fail(`${course.id} has no catalog schedule but VV lists ${officialSessions.length} slot(s)`);
      }
    }
  }

  pass(`Compared ${compared} courses with official VV snapshots`);
  pass(`${scheduled} of those have catalog timetable slots`);
  if (noOfficial && PLAN_ONLY) {
    warn(`${noOfficial} planned courses have no Fall 2026 module-tree snapshot`);
  } else if (noOfficial) {
    pass(`${noOfficial} other catalog courses are outside the current Fall 2026 module tree (spring/irregular/admission)`);
  }

  const fallCodes = new Set(
    Object.values(manifest.modules || {}).flat().map((entry) => entry.code).filter(Boolean),
  );
  const catalogCodes = new Set(courses.map((course) => course.code));
  const missingCodes = [...fallCodes].filter((code) => !catalogCodes.has(code));
  if (missingCodes.length) fail(`Fall 2026 module-tree codes missing from catalog: ${missingCodes.join(', ')}`);
  else pass(`All ${fallCodes.size} Fall 2026 module-tree course codes are in the catalog`);

  console.log('\n=== SUMMARY ===');
  console.log(`Errors: ${issues.length}`);
  console.log(`Warnings: ${warnings.length}`);
  if (issues.length) {
    issues.forEach((item) => console.log(`  ERROR: ${item}`));
    process.exit(1);
  }
  console.log('\nCourse time/location/detail checks passed.');
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
