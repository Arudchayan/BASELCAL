/**
 * Independent validation suite — run: npm run validate
 * Exit 0 = all checks pass. Exit 1 = failures found.
 *
 * Official targets (Uni Basel MSc Data Science 2026):
 *   Admission exact 28, foundations min 18×3 and min 64 sum,
 *   electives exact 20, thesis exact 36, MSc exact 120, grand exact 148.
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

/** Parse ML_PHD_PRESET_IDS from types.ts — single source of truth for preset IDs */
function parsePresetFromTypes(src) {
  const match = src.match(/export const ML_PHD_PRESET_IDS[^=]*=\s*(\{[\s\S]*?\n\});/);
  if (!match) throw new Error('Could not parse ML_PHD_PRESET_IDS from types.ts');
  // Strip line comments then evaluate as object literal
  const cleaned = match[1].replace(/\/\/[^\n]*/g, '');
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${cleaned});`)();
}

const PRESET = parsePresetFromTypes(typesTs);

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

console.log('\nCHECK 2: Admission CP');
const adm = courses.filter(c => c.type === 'Admission');
const admCp = adm.reduce((s, c) => s + c.cp, 0);
if (admCp !== 28) fail(`Admission catalog total ${admCp} != 28`);
else pass(`Admission catalog = ${admCp} CP (${adm.length} courses)`);

const analysisCp = adm.filter(c => /analysis/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
const algoCp = adm.filter(c => /algorithm|data structure/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
const sciCp = adm.filter(c => /scientific computing/i.test(c.title)).reduce((s,c)=>s+c.cp,0);
if (analysisCp + algoCp + sciCp !== 28) fail(`Admission sub-groups sum ${analysisCp}+${algoCp}+${sciCp} != 28`);
else pass(`Admission breakdown: Analysis=${analysisCp}, Algorithms=${algoCp}, SciComp=${sciCp}`);

if (!agentMd.includes('12 + 8 + 8 = 28')) warn('agent.md may not reflect admission breakdown');

console.log('\nCHECK 3: Preset plan arithmetic (must be official 148/120)');
const presetIds = Object.values(PRESET).flat();
const preset = presetIds.map(id => courses.find(c => c.id === id));
const missingPreset = presetIds.filter((id, i) => !preset[i]);
if (missingPreset.length) fail(`Preset missing IDs: ${missingPreset.join(', ')}`);
else pass('All preset IDs exist in catalog');

// Ensure types.ts preset matches
let presetIdGaps = 0;
for (const [sem, list] of Object.entries(PRESET)) {
  for (const id of list) {
    if (!typesTs.includes(`'${id}'`) && !typesTs.includes(`"${id}"`)) {
      fail(`types.ts ML_PHD_PRESET_IDS missing ${id} (${sem})`);
      presetIdGaps++;
    }
  }
}
if (presetIdGaps === 0) pass('types.ts preset IDs present');

const sumMod = (mod) => preset.filter(c => c && c.module === mod).reduce((s,c)=>s+c.cp,0);
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

if (stats.admission !== OFFICIAL.admission) fail(`Preset admission ${stats.admission} != ${OFFICIAL.admission}`);
else pass(`Preset admission = ${stats.admission}`);
if (stats.math < OFFICIAL.math) fail(`Preset math ${stats.math} < min ${OFFICIAL.math}`);
else pass(`Preset math = ${stats.math} (>= ${OFFICIAL.math})`);
if (stats.ml < OFFICIAL.ml) fail(`Preset ml ${stats.ml} < min ${OFFICIAL.ml}`);
else pass(`Preset ml = ${stats.ml} (>= ${OFFICIAL.ml})`);
if (stats.sys < OFFICIAL.sys) fail(`Preset systems ${stats.sys} < min ${OFFICIAL.sys}`);
else pass(`Preset systems = ${stats.sys} (>= ${OFFICIAL.sys})`);
if (stats.foundationsSum < OFFICIAL.foundationsSum) fail(`Preset foundations ${stats.foundationsSum} < min ${OFFICIAL.foundationsSum}`);
else pass(`Preset foundations = ${stats.foundationsSum} (>= ${OFFICIAL.foundationsSum})`);
if (stats.electives !== OFFICIAL.electives) fail(`Preset electives ${stats.electives} != exact ${OFFICIAL.electives}`);
else pass(`Preset electives = ${stats.electives}`);
if (stats.thesis !== OFFICIAL.thesis) fail(`Preset thesis ${stats.thesis} != exact ${OFFICIAL.thesis}`);
else pass(`Preset thesis = ${stats.thesis}`);
if (stats.mscTotal !== OFFICIAL.mscTotal) fail(`Preset MSc total ${stats.mscTotal} != exact ${OFFICIAL.mscTotal}`);
else pass(`Preset MSc total = ${stats.mscTotal}`);
if (stats.grandTotal !== OFFICIAL.grandTotal) fail(`Preset grand total ${stats.grandTotal} != exact ${OFFICIAL.grandTotal}`);
else pass(`Preset grand total = ${stats.grandTotal}`);

// Causal Inference must be in a spring semester
const causalSem = Object.entries(PRESET).find(([, idsList]) => idsList.includes('E-58920'))?.[0];
if (causalSem !== 's2' && causalSem !== 's4') fail(`E-58920 Causal Inference in ${causalSem} (must be Spring s2/s4)`);
else pass(`E-58920 Causal Inference placed in ${causalSem} (Spring)`);

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

/** Only admission co-requisites that share a VV slot with no alternate group in catalog */
const ALLOWED_PRESET_CLASHES = new Set(['AD-11037|AD-20980', 'AD-20980|AD-11037']);

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

const SEM_CP_LIMITS = { s1: 36, s2: 36, s3: 42, s4: 46 };
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
      `${sem.toUpperCase()} has ${allowed.length} allowlisted admission clash(es) (no alternate VV group):`,
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


console.log('\nCHECK 7: Live VV scrape coverage');
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
if (agentMd.includes('perfectly mathematically balanced') && agentMd.includes('148')) {
  // OK if it still says 148 and is accurate
}
if (/S2.*40 CP|Spring - 40/.test(agentMd) && !/42|46|40/.test('')) {
  // soft
}
if (agentMd.includes('122') || /150 CP/.test(agentMd) && !agentMd.includes('148')) {
  warn('agent.md may still reference old 150/122 totals');
}
if (!agentMd.includes('Last verified') && !agentMd.includes('last verified')) {
  warn('agent.md missing last-verified date');
}
if (agentMd.includes('exactly 120') || agentMd.includes('Exactly 120') || agentMd.includes('120 CP')) {
  pass('agent.md references 120 CP MSc');
} else {
  warn('agent.md may not state exact 120 MSc');
}

function parseStaleWatchIdsFromFreshness(src) {
  // Legacy inline array (pre-coveragePolicy import)
  const block = src.match(/staleWatchIds:\s*\[([\s\S]*?)\]\s*(?:as\s*string\[\])?/);
  if (block && !src.includes('COVERAGE_POLICY')) {
    return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }
  return null; // delegated to coverage_policy.json
}

function setDiff(a, b) {
  const bs = new Set(b);
  return [...a].filter((x) => !bs.has(x));
}

console.log('\nCHECK 9: VV coverage audit (vv_msc_ds_official.json)');
if (fs.existsSync('coverage_policy.json')) {
  const policy = coveragePolicy;
  const freshnessSrc = fs.readFileSync('src/dataFreshness.ts', 'utf8');
  const coveragePolicySrc = fs.readFileSync('src/coveragePolicy.ts', 'utf8');
  if (!freshnessSrc.includes('COVERAGE_POLICY') || !coveragePolicySrc.includes('coverage_policy.json')) {
    fail('dataFreshness/coveragePolicy must import coverage_policy.json for stale watches');
  } else {
    pass(`${(policy.staleWatchIds || []).length} stale-watch IDs aligned (coverage_policy ↔ dataFreshness)`);
  }
  const uiStale = parseStaleWatchIdsFromFreshness(freshnessSrc);
  if (uiStale) {
    const policyStale = policy.staleWatchIds || [];
    const staleDiff = [...setDiff(uiStale, policyStale), ...setDiff(policyStale, uiStale)];
    if (staleDiff.length) warn(`staleWatchIds mismatch UI vs coverage_policy: ${staleDiff.join(', ')}`);
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

if (fs.existsSync('vv_msc_ds_official.json')) {
  const audit = JSON.parse(fs.readFileSync('vv_msc_ds_official.json', 'utf8'));
  const realIds = courses.filter((c) => !['T-PREP', 'T-THESIS', 'E-PROJ6', 'ML-PROJ6', 'S-PROJ6'].includes(c.id));
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
  warn('vv_msc_ds_official.json not found — run node vv_msc_ds_official_scrape.cjs');
}

console.log('\nCHECK 11: Field quality (template/generic detection)');
const SYNTHETIC_IDS = new Set(['T-PREP', 'T-THESIS', 'E-PROJ6', 'ML-PROJ6', 'S-PROJ6']);
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
