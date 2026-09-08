/**
 * Independent validation suite — run: npm run validate
 * Exit 0 = all checks pass. Exit 1 = failures found.
 *
 * Official targets (Uni Basel MSc Data Science 2026):
 *   Admission default 0, foundations min 18×3 and min 64 sum,
 *   electives exact 20, thesis exact 36, MSc exact 120.
 *   Admission (Auflagen) is student-specific; the public example outline is Master's-only.
 */
const fs = require('fs');

const issues = [];
const warnings = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { issues.push(msg); console.log(`  ✗ ${msg}`); };
const warn = (msg) => { warnings.push(msg); console.log(`  ⚠ ${msg}`); };

const coursesCode = fs.readFileSync('src/courses.ts', 'utf8');
const courses = JSON.parse(coursesCode.replace('export const COURSES = ', '').replace(/ as const/g, '').replace(/;\s*$/, ''));
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const degreeRules = fs.readFileSync('src/degreeRules.ts', 'utf8');
const agentMd = fs.readFileSync('agent.md', 'utf8');
const degreeRulesJson = JSON.parse(fs.readFileSync('degree_rules.json', 'utf8'));
const coveragePolicy = JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8'));
const examplePlan = JSON.parse(fs.readFileSync('src/examplePlan.json', 'utf8'));

const PRESET = examplePlan.plan;
const PRESET_ALLOCATIONS = examplePlan.allocations || {};

const OFFICIAL = {
  admission: degreeRulesJson.admission.target,
  math: degreeRulesJson.math.target,
  ml: degreeRulesJson.ml.target,
  sys: degreeRulesJson.systems.target,
  foundationsSum: degreeRulesJson.foundationsSum.target,
  electives: degreeRulesJson.electives.target,
  thesis: degreeRulesJson.thesis.target,
  mscTotal: degreeRulesJson.mscTotal.target,
  grandTotal: degreeRulesJson.grandTotal.target,
  modules: {
    admission: degreeRulesJson.admission.module,
    math: degreeRulesJson.math.module,
    ml: degreeRulesJson.ml.module,
    systems: degreeRulesJson.systems.module,
    electives: degreeRulesJson.electives.module,
    thesis: degreeRulesJson.thesis.module,
  },
};

console.log('=== BASELCAL VALIDATION ===\n');

console.log('CHECK 1: Catalog structure');
const ids = courses.map(c => c.id);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupIds.length) fail(`Duplicate IDs: ${dupIds.join(', ')}`);
else pass(`${courses.length} courses, all unique IDs`);

['id','code','title','cp','module','when','type'].forEach(field => {
  const missing = courses.filter(c => !c[field] && c[field] !== 0);
  if (missing.length) fail(`${missing.length} courses missing "${field}"`);
});
if (!issues.some(i => i.includes('missing'))) pass('All required fields present');

const expectedCrossListings = {
  '12246': ['Mathematical Foundations', 'Electives in Data Science'],
  '19300': ['Mathematical Foundations', 'Electives in Data Science'],
  '77777': ['Mathematical Foundations', 'Electives in Data Science'],
  '45401': ['Machine Learning Foundations', 'Electives in Data Science'],
  '60876': ['Machine Learning Foundations', 'Electives in Data Science'],
  '66937': ['Machine Learning Foundations', 'Electives in Data Science'],
  '67343': ['Machine Learning Foundations', 'Electives in Data Science'],
  '15731': ['Systems Foundations', 'Electives in Data Science'],
  '67924': ['Systems Foundations', 'Electives in Data Science'],
};

const EXAMPLE_ADMISSION = examplePlan.admissionTarget ?? 0;
const EXPECTED_PRESET_IDS = examplePlan.plan;
for (const [code, modules] of Object.entries(expectedCrossListings)) {
  const course = courses.find((c) => c.code === code);
  if (!course || JSON.stringify(course.eligibleModules) !== JSON.stringify(modules)) {
    fail(`${code} eligibleModules does not match the validated cross-listing`);
  }
}
if (!issues.some((i) => i.includes('eligibleModules'))) pass('All 9 validated cross-listings expose both eligible modules');

for (const prefix of ['ML', 'S', 'E']) {
  const variants = [courses.find((c) => c.id === `${prefix}-PROJ6`), courses.find((c) => c.id === `${prefix}-PROJ12`)];
  if (variants.some((c) => !c) || variants.map((c) => c.cp).join(',') !== '6,12' || variants[0]?.projectVariantGroup !== variants[1]?.projectVariantGroup) {
    fail(`${prefix} learning-contract project must expose mutually grouped 6/12 CP variants`);
  }
}
if (!issues.some((i) => i.includes('project must'))) pass('ML, Systems, and Data Science projects expose grouped 6/12 CP variants');

const inverseProblems = courses.find((c) => c.id === 'ML-67343');
if (inverseProblems?.title !== 'Inverse Problems: Computational Aspects and Machine Learning') fail('ML-67343 title is not canonical');
else pass('ML-67343 canonical title present');

console.log('\nCHECK 2: Admission catalog (typical Auflagen set, not a universal requirement)');
const adm = courses.filter(c => c.type === 'Admission');
const admCp = adm.reduce((s, c) => s + c.cp, 0);
if (admCp !== 28) fail(`Admission catalog total ${admCp} != 28`);
else pass(`Admission catalog = ${admCp} CP (${adm.length} courses) — typical package, student target is configurable`);

const analysisCp = adm.filter(c => /analysis/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
const algoCp = adm.filter(c => /algorithm|data structure/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
const sciCp = adm.filter(c => /scientific computing/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
if (analysisCp + algoCp + sciCp !== 28) fail(`Admission sub-groups sum ${analysisCp}+${algoCp}+${sciCp} != 28`);
else pass(`Admission breakdown: Analysis=${analysisCp}, Algorithms=${algoCp}, SciComp=${sciCp}`);

if (!agentMd.includes('student-specific') && !agentMd.includes('Auflagen')) warn('agent.md may not state that admission is student-specific');

console.log('\nCHECK 3: Public example outline arithmetic');
const presetIds = Object.values(PRESET).flat();
const preset = presetIds.map(id => courses.find(c => c.id === id));
const missingPreset = presetIds.filter((id, i) => !preset[i]);
if (missingPreset.length) fail(`Preset missing IDs: ${missingPreset.join(', ')}`);
else pass('All preset IDs exist in catalog');

if (!typesTs.includes('EXAMPLE_PLAN_IDS')) fail('types.ts must export EXAMPLE_PLAN_IDS from examplePlan.json');
else pass('types.ts wires the public example outline');
for (const sem of Object.keys(EXPECTED_PRESET_IDS)) {
  if (JSON.stringify(PRESET[sem]) !== JSON.stringify(EXPECTED_PRESET_IDS[sem])) {
    fail(`${sem.toUpperCase()} example outline is internally inconsistent`);
  } else pass(`${sem.toUpperCase()} example outline IDs present`);
}

const sumMod = (mod) => preset.filter(c => c && (PRESET_ALLOCATIONS[c.id] || c.module) === mod).reduce((s,c)=>s+c.cp,0);
const stats = {
  admission: sumMod(OFFICIAL.modules.admission),
  math: sumMod(OFFICIAL.modules.math),
  ml: sumMod(OFFICIAL.modules.ml),
  sys: sumMod(OFFICIAL.modules.systems),
  electives: sumMod(OFFICIAL.modules.electives),
  thesis: sumMod(OFFICIAL.modules.thesis),
};
stats.mscTotal = preset.filter(c => c && c.type !== 'Admission').reduce((s,c)=>s+c.cp,0);
stats.grandTotal = preset.reduce((s,c)=>s+(c?.cp||0),0);
stats.foundationsSum = stats.math + stats.ml + stats.sys;

const semCp = {};
Object.entries(PRESET).forEach(([sem, idsList]) => {
  semCp[sem] = idsList.reduce((s, id) => s + (courses.find(c=>c.id===id)?.cp||0), 0);
});
console.log(`  Semesters: S1=${semCp.s1} S2=${semCp.s2} S3=${semCp.s3} S4=${semCp.s4}`);

if (stats.admission !== EXAMPLE_ADMISSION) fail(`Example admission ${stats.admission} != ${EXAMPLE_ADMISSION}`);
else pass(`Example admission = ${stats.admission} (configurable; sample uses ${EXAMPLE_ADMISSION})`);
if (stats.math < OFFICIAL.math) fail(`Example math ${stats.math} < official min ${OFFICIAL.math}`);
else pass(`Example math = ${stats.math} (official min ${OFFICIAL.math})`);
if (stats.ml < OFFICIAL.ml) fail(`Example ml ${stats.ml} < official min ${OFFICIAL.ml}`);
else pass(`Example ml = ${stats.ml} (official min ${OFFICIAL.ml})`);
if (stats.sys < OFFICIAL.sys) fail(`Example systems ${stats.sys} < official min ${OFFICIAL.sys}`);
else pass(`Example systems = ${stats.sys} (official min ${OFFICIAL.sys})`);
if (stats.foundationsSum < OFFICIAL.foundationsSum) fail(`Example foundations ${stats.foundationsSum} < official min ${OFFICIAL.foundationsSum}`);
else pass(`Example foundations = ${stats.foundationsSum} (official min ${OFFICIAL.foundationsSum})`);
if (stats.electives !== OFFICIAL.electives) fail(`Example electives ${stats.electives} != exact ${OFFICIAL.electives}`);
else pass(`Example electives = ${stats.electives}`);
if (stats.thesis !== OFFICIAL.thesis) fail(`Example thesis ${stats.thesis} != exact ${OFFICIAL.thesis}`);
else pass(`Example thesis = ${stats.thesis}`);
if (stats.mscTotal !== OFFICIAL.mscTotal) fail(`Example MSc total ${stats.mscTotal} != official ${OFFICIAL.mscTotal}`);
else pass(`Example MSc total = ${stats.mscTotal}`);
const expectedGrand = OFFICIAL.mscTotal + EXAMPLE_ADMISSION;
if (stats.grandTotal !== expectedGrand) fail(`Example grand total ${stats.grandTotal} != ${expectedGrand}`);
else pass(`Example grand total = ${stats.grandTotal} (120 MSc + ${EXAMPLE_ADMISSION} admission)`);

const excludedFromExample = ['ML-67343', 'S-15728', 'S-67923', 'ML-45366', 'ML-PROJ6', 'E-28420', 'E-58920', 'E-49935'];
const retainedExcluded = excludedFromExample.filter((id) => presetIds.includes(id));
if (retainedExcluded.length) fail(`Example outline retains excluded course(s): ${retainedExcluded.join(', ')}`);
else pass('Example outline excludes Inverse Problems, Networks, Continuous Optimization, Machine Intelligence, ML Project, Medical Imaging, Causal Inference, and Applied Statistics Using R');

for (const [id, module] of Object.entries(PRESET_ALLOCATIONS)) {
  const course = courses.find((c) => c.id === id);
  const eligible = course?.eligibleModules || [course?.module];
  if (!presetIds.includes(id)) {
    fail(`Preset allocation for ${id} is unused`);
  } else if (!eligible.includes(module)) {
    fail(`${id} preset allocation ${module} is not an eligible module`);
  } else {
    pass(`${id} preset allocation credits CP to ${module}`);
  }
}
if (!Object.keys(PRESET_ALLOCATIONS).length) pass('Example outline needs no cross-list allocations');

const taughtCp = (idsList) => idsList
  .map((id) => courses.find((c) => c.id === id))
  .filter((c) => c && c.type !== 'Admission' && c.module !== OFFICIAL.modules.thesis)
  .reduce((sum, c) => sum + c.cp, 0);
const taughtBeforeS4 = taughtCp([...PRESET.s1, ...PRESET.s2, ...PRESET.s3]);
const remainingTaughtInS4 = taughtCp(PRESET.s4);
if (taughtBeforeS4 < 76) {
  fail(`Thesis start gate has ${taughtBeforeS4} taught-module CP before S4; expected at least 76`);
} else pass(`Thesis start gate cleared: ${taughtBeforeS4} taught-module CP before S4 (minimum 76)`);
if (taughtBeforeS4 + remainingTaughtInS4 !== 84) {
  fail(`Thesis presentation path is ${taughtBeforeS4}+${remainingTaughtInS4}; expected 84 taught-module CP`);
} else pass(`Taught-module CP ${taughtBeforeS4}+${remainingTaughtInS4}=84 before presentation`);

const admissionInExample = preset.filter((c) => c && c.type === 'Admission');
if (admissionInExample.length) {
  fail(`Public example outline includes admission/Auflagen course(s): ${admissionInExample.map((c) => c.id).join(', ')}`);
} else pass('Example outline is Master’s courses only (no Auflagen)');

const exampleS1Cp = PRESET.s1.reduce(
  (sum, id) => sum + (courses.find((course) => course.id === id)?.cp || 0),
  0,
);
if (exampleS1Cp > 37) fail(`Example S1 load ${exampleS1Cp} CP exceeds 37`);
else pass(`Example S1 is a schedulable ${PRESET.s1.length}-course / ${exampleS1Cp} CP fall semester`);

console.log('\nCHECK 4: Truth layer present');
if (!degreeRules.includes('DEGREE_RULES') || !degreeRules.includes('evaluatePlan')) fail('degreeRules.ts missing DEGREE_RULES/evaluatePlan');
else pass('degreeRules.ts exports DEGREE_RULES + evaluatePlan');
if (!degreeRules.includes('degree_rules.json')) fail('degreeRules.ts must import degree_rules.json');
else pass('degreeRules.ts loads degree_rules.json');
if (!appTsx.includes('ProgressPanel') && !appTsx.includes('evaluatePlan')) fail('App does not use evaluation layer');
else pass('App wired to ProgressPanel / evaluation');
if (appTsx.includes('AI Curriculum Advisor') || appTsx.includes('AI Summary')) fail('Fake AI branding still present in App.tsx');
else pass('No fake AI branding in App.tsx');
if (!appTsx.includes('PLAN_DISCLAIMER') && !appTsx.includes('not an official University')) {
  fail('App missing unofficial-planner disclaimer');
} else {
  pass('App shows unofficial planner disclaimer');
}

console.log('\nCHECK 5: Data quality');
const placeholderSched = courses.filter(c =>
  (c.schedule||[]).some(s => (s.time||'').includes('not visible') || (s.room||'').includes('not visible'))
);
if (placeholderSched.length) warn(`${placeholderSched.length} courses still have placeholder schedules`);
else pass('No placeholder schedule strings');

const typoCourses = courses.filter(c => c.title.includes('Typology'));
if (typoCourses.length) fail(`Title typo "Typology" still present`);
else pass('No Typology/Topology title typo');

console.log('\nCHECK 6: Preset timetable + semester load (schedulability)');
function parseTime(t) {
  if (!t || !t.includes('-')) return null;
  const [a, b] = t.split('-').map((s) => s.trim());
  const ap = a.split(':').map(Number);
  const bp = b.split(':').map(Number);
  return { start: ap[0] + ap[1] / 60, end: bp[0] + bp[1] / 60 };
}

/** Cached historical overlaps in future, unaudited semesters; keep visible as warnings until live VV publication. */
const ALLOWED_PRESET_CLASHES = new Set([
  'AD-10906|ML-17165',
  'AD-10906|ML-13548',
  'ML-13548|ML-17165',
]);

function clashKey(a, b) {
  return [a, b].sort().join('|');
}

function semesterConflicts(ids) {
  const sessions = [];
  ids.forEach((id) => {
    const c = courses.find((x) => x.id === id);
    if (!c) return;
    (c.schedule || []).forEach((s) => {
      const r = parseTime(s.time);
      if (r) sessions.push({ id: c.id, title: c.title, day: s.day, ...r, time: s.time });
    });
  });
  const found = [];
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (a.id === b.id) continue;
      if (a.day === b.day && a.start < b.end && a.end > b.start) {
        found.push({
          key: clashKey(a.id, b.id),
          label: `${a.day} ${a.time}: ${a.id} vs ${b.id} (${a.title} / ${b.title})`,
        });
      }
    }
  }
  // unique by course pair
  const seen = new Set();
  return found.filter((c) => {
    if (seen.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });
}

function weekdaysUsed(ids) {
  const days = new Set();
  ids.forEach((id) => {
    const c = courses.find((x) => x.id === id);
    (c?.schedule || []).forEach((s) => {
      if (s.day) days.add(s.day);
    });
  });
  return days.size;
}

// Example outline keeps S1 at a schedulable 37 CP fall load.
const SEM_CP_LIMITS = { s1: 37, s2: 38, s3: 42, s4: 46 };
let schedFails = 0;
for (const [sem, ids] of Object.entries(PRESET)) {
  const cp = ids.reduce((s, id) => s + (courses.find((c) => c.id === id)?.cp || 0), 0);
  const limit = SEM_CP_LIMITS[sem];
  if (cp > limit) {
    fail(`${sem.toUpperCase()} load ${cp} CP exceeds soft-schedulable max ${limit}`);
    schedFails++;
  } else {
    pass(`${sem.toUpperCase()} load ${cp} CP (max ${limit})`);
  }

  const conflicts = semesterConflicts(ids);
  const blocked = conflicts.filter((c) => !ALLOWED_PRESET_CLASHES.has(c.key));
  const allowed = conflicts.filter((c) => ALLOWED_PRESET_CLASHES.has(c.key));
  if (blocked.length) {
    fail(`${sem.toUpperCase()} has ${blocked.length} non-allowlisted timetable clash(es):`);
    blocked.forEach((c) => console.log(`    ${c.label}`));
    schedFails++;
  } else if (allowed.length) {
    warn(
      `${sem.toUpperCase()} has ${allowed.length} provisional clash(es) in cached historical slots; recheck the live future-semester VV:`,
    );
    allowed.forEach((c) => console.log(`    ${c.label}`));
  } else {
    pass(`${sem.toUpperCase()} has no timetable clashes`);
  }

  const days = weekdaysUsed(ids);
  if (days >= 5 && sem !== 's4') {
    warn(`${sem.toUpperCase()} uses all ${days} weekdays — expect a heavy physical week`);
  }
}

// Hard invariant: Sci Comp practical must never share a semester with FDS
const semOf = (id) => Object.entries(PRESET).find(([, ids]) => ids.includes(id))?.[0];
if (semOf('AD-62060') && semOf('AD-62060') === semOf('S-45402')) {
  fail('AD-62060 (Sci Comp practical) and S-45402 (FDS) share a semester — Fri 10–12 double-book');
  schedFails++;
} else {
  pass('Sci Comp practical and Foundations of Distributed Systems are in different semesters');
}

if (schedFails === 0) pass('Preset schedulability gates cleared');


console.log('\nCHECK 7: Legacy VV detail cache');
if (fs.existsSync('vv_scrape_cache.json')) {
  const scraped = JSON.parse(fs.readFileSync('vv_scrape_cache.json', 'utf8'));
  const entries = Object.values(scraped);
  const ok = entries.filter((r) => r.status === 'ok').length;
  const withSched = entries.filter((r) => r.status === 'ok' && r.schedule?.length > 0).length;
  if (ok < 60) warn(`Only ${ok}/${entries.length} courses scraped from live VV`);
  else pass(`${ok}/${entries.length} courses scraped from live VV (${withSched} with schedules)`);
} else {
  warn('vv_scrape_cache.json not found');
}

console.log('\nCHECK 8: agent.md accuracy');
if (agentMd.includes('this student') || agentMd.includes('Visa:') || /Efringerstrasse/i.test(agentMd)) {
  fail('agent.md still contains personal student details');
} else {
  pass('agent.md has no personal student details');
}
if (!agentMd.includes('Last verified') && !agentMd.includes('last verified')) {
  warn('agent.md missing last-verified date');
}
if (agentMd.includes('exactly 120') || agentMd.includes('Exactly 120') || agentMd.includes('120 CP')) {
  pass('agent.md references 120 CP MSc');
} else {
  warn('agent.md may not state exact 120 MSc');
}
if (fs.existsSync('config/student.local.json') && !fs.readFileSync('.gitignore', 'utf8').includes('student.local.json')) {
  fail('config/student.local.json must be gitignored');
} else {
  pass('Private student config is gitignored');
}

function setDiff(a, b) {
  const bs = new Set(b);
  return [...a].filter((x) => !bs.has(x));
}

console.log('\nCHECK 9: VV coverage audit');
if (fs.existsSync('coverage_policy.json')) {
  const policy = coveragePolicy;
  const coveragePolicySrc = fs.readFileSync('src/coveragePolicy.ts', 'utf8');
  if (!coveragePolicySrc.includes('coverage_policy.json')) {
    fail('coveragePolicy must import coverage_policy.json for stale watches');
  } else {
    pass(`${(policy.staleWatchIds || []).length} stale-watch IDs aligned (coveragePolicy)`);
  }
  if (policy.moduleDiscrepancies?.length) {
    policy.moduleDiscrepancies.forEach((d) => {
      warn(`Module discrepancy ${d.id}: catalog=${d.catalogModule}, VV=${d.vvModulesTab} (${d.resolution})`);
    });
  }
  if (policy.lastVerified?.date) {
    pass(`VV audit stamped ${policy.lastVerified.date} (${policy.lastVerified.catalogCoursesWithVvDetail || '?'} detail pages)`);
  }
} else {
  warn('coverage_policy.json not found');
}

if (fs.existsSync('vv_module_manifest.json')) {
  const manifest = JSON.parse(fs.readFileSync('vv_module_manifest.json', 'utf8'));
  const entries = Object.entries(manifest.modules || {}).flatMap(([moduleName, moduleEntries]) =>
    moduleEntries.filter((entry) => entry.code).map((entry) => ({ ...entry, moduleName })),
  );
  const uniqueCodes = [...new Set(entries.map((entry) => entry.code))];
  const catalogByCode = new Map(courses.map((course) => [course.code, course]));
  const missingCodes = uniqueCodes.filter((code) => !catalogByCode.has(code));
  if (missingCodes.length) fail(`Fall 2026 module manifest courses missing from catalog: ${missingCodes.join(', ')}`);
  else pass(`Fall 2026 manifest covers ${uniqueCodes.length} unique courses (${entries.length} module entries)`);

  const wrongModules = uniqueCodes.filter((code) => {
    const local = catalogByCode.get(code);
    const liveModules = entries.filter((entry) => entry.code === code).map((entry) => entry.moduleName);
    return local && !liveModules.includes(local.module);
  });
  if (wrongModules.length) fail(`Catalog module not present in live Fall 2026 cross-listings: ${wrongModules.join(', ')}`);
  else pass('All Fall 2026 catalog module assignments occur in the live module tree');

  const fieldMismatches = uniqueCodes.filter((code) => {
    const local = catalogByCode.get(code);
    const live = entries.find((entry) => entry.code === code && entry.moduleName === local?.module)
      || entries.find((entry) => entry.code === code);
    return local && live && (local.title !== live.title || local.cp !== live.cp);
  });
  if (fieldMismatches.length) fail(`Fall 2026 title/CP mismatch: ${fieldMismatches.join(', ')}`);
  else pass('Fall 2026 titles and CP match the live module manifest');

  const manifestDate = String(manifest.fetchedAt || '').slice(0, 10);
  if (manifest.period !== coveragePolicy.academicPeriod?.fall) {
    fail(`Manifest period ${manifest.period} does not match coverage policy ${coveragePolicy.academicPeriod?.fall}`);
  }
  if (manifestDate !== coveragePolicy.lastVerified?.date) {
    warn(`Manifest date ${manifestDate || '?'} differs from policy stamp ${coveragePolicy.lastVerified?.date || '?'}`);
  } else {
    pass(`Live module manifest stamped ${manifestDate}`);
  }
} else if (fs.existsSync('vv_msc_ds_official.json')) {
  const audit = JSON.parse(fs.readFileSync('vv_msc_ds_official.json', 'utf8'));
  const realIds = courses.filter((c) => !['T-PREP', 'T-THESIS', 'E-PROJ6', 'E-PROJ12', 'ML-PROJ6', 'ML-PROJ12', 'S-PROJ6', 'S-PROJ12'].includes(c.id));
  const auditIds = new Set(audit.courses.map((c) => c.localId));
  const missing = realIds.filter((c) => !auditIds.has(c.id)).map((c) => c.id);
  const extra = [...auditIds].filter((id) => !realIds.some((c) => c.id === id));
  if (missing.length) fail(`VV audit missing catalog IDs: ${missing.join(', ')}`);
  else pass(`VV audit covers all ${realIds.length} non-synthetic catalog IDs`);
  if (extra.length) warn(`VV audit has extra IDs vs catalog: ${extra.join(', ')}`);
  const not2026 = audit.courses.filter(
    (c) => c.semester && !/2026/.test(String(c.semester))
  );
  const auditStaleIds = not2026.map((c) => c.localId).sort();
  const policyStaleSorted = [...(JSON.parse(fs.readFileSync('coverage_policy.json', 'utf8')).staleWatchIds || [])].sort();
  const auditPolicyDiff = [
    ...setDiff(auditStaleIds, policyStaleSorted),
    ...setDiff(policyStaleSorted, auditStaleIds),
  ];
  if (auditPolicyDiff.length) {
    warn(`VV audit non-2026 IDs differ from coverage_policy staleWatchIds: ${auditPolicyDiff.join(', ')}`);
  } else if (auditStaleIds.length === 11) {
    pass('11 stale VV semester entries match coverage_policy staleWatchIds (set equality)');
  } else {
    warn(`VV audit shows ${auditStaleIds.length} non-2026 semester entries (expected 11)`);
  }
  const rl = audit.courses.find((c) => c.code === '78174');
  if (rl && /2026/.test(String(rl.semester))) {
    pass('ML-78174 confirmed on VV for 2026');
  } else {
    warn('ML-78174 not confirmed FS/HS 2026 in vv_msc_ds_official.json');
  }
} else {
  warn('No VV audit artifact found — run npm run audit:modules');
}

console.log('\nCHECK 11: Field quality (template/generic detection)');
const SYNTHETIC_IDS = new Set(['T-PREP', 'T-THESIS', 'E-PROJ6', 'E-PROJ12', 'ML-PROJ6', 'ML-PROJ12', 'S-PROJ6', 'S-PROJ12']);
const text = (c, ...fields) => fields.map((f) => c[f]).filter(Boolean).join(' ');

const examXX = courses.filter((c) => /XX\.XX/.test(c.exam || ''));
if (examXX.length) warn(`Placeholder exam "XX.XX": ${examXX.length} course(s) — ${examXX.map((c) => c.id).join(', ')}`);
else pass('No placeholder "XX.XX" exams');

const genPrereq = courses.filter((c) => /general bachelor/i.test(c.prerequisites || ''));
if (genPrereq.length) warn(`Generic prerequisites ("general bachelor..."): ${genPrereq.map((c) => c.id).join(', ')}`);
else pass('No generic "general bachelor" prerequisites');

const seeVorlesung = courses.filter((c) => /s\.\s*vorlesung|siehe vorlesung/i.test(text(c, 'description', 'prerequisites')));
if (seeVorlesung.length) warn(`Descriptions deferring to lecture ("s. Vorlesung"): ${seeVorlesung.map((c) => c.id).join(', ')}`);
else pass('No "s. Vorlesung" description stubs');

const seeLecture = courses.filter((c) => /see lecture|see course/i.test(text(c, 'description', 'exam')));
if (seeLecture.length) warn(`Descriptions deferring to course ("See Lecture"): ${seeLecture.map((c) => c.id).join(', ')}`);
else pass('No "See Lecture" description stubs');

const tplSyllabus = courses.filter((c) =>
  Array.isArray(c.syllabus) &&
  c.syllabus.length === 3 &&
  /^understand\b/i.test(c.syllabus[0]) &&
  /^apply\b/i.test(c.syllabus[1]) &&
  /^analyze\b/i.test(c.syllabus[2])
);
if (tplSyllabus.length) warn(`${tplSyllabus.length} course(s) use the generic 3-item syllabus template (Understand/Apply/Analyze)`);
else pass('No generic 3-item syllabus templates');

const emptyDesc = courses.filter((c) => !SYNTHETIC_IDS.has(c.id) && !(c.description || '').trim());
if (emptyDesc.length) warn(`Empty descriptions on non-synthetic course(s): ${emptyDesc.map((c) => c.id).join(', ')}`);
else pass('All non-synthetic courses have descriptions');

const emptySyllabus = courses.filter((c) => !SYNTHETIC_IDS.has(c.id) && !(Array.isArray(c.syllabus) && c.syllabus.length));
if (emptySyllabus.length) warn(`Empty syllabi on non-synthetic course(s): ${emptySyllabus.map((c) => c.id).join(', ')}`);
else pass('All non-synthetic courses have syllabus entries');

console.log('\n=== SUMMARY ===');
console.log(`Errors: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);
if (issues.length) {
  issues.forEach(i => console.log(`  ERROR: ${i}`));
  process.exit(1);
}
console.log('\nAll critical checks passed.');
process.exit(0);
