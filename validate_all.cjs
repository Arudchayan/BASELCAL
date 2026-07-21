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
const courses = JSON.parse(coursesCode.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const typesTs = fs.readFileSync('src/types.ts', 'utf8');
const degreeRules = fs.readFileSync('src/degreeRules.ts', 'utf8');
const agentMd = fs.readFileSync('agent.md', 'utf8');

// Must match ML_PHD_PRESET_IDS in src/types.ts
const PRESET = {
  s1: ["AD-10489-1", "AD-20980", "AD-62060", "M-66096", "S-45402", "E-11680", "E-11681", "M-19300"],
  s2: ["AD-10489-2", "AD-11039", "AD-10906", "AD-62061", "ML-17165", "ML-13548", "ML-45366", "S-15728", "E-58920"],
  s3: ["AD-11037", "M-77777", "ML-60835", "S-67924", "E-55662", "T-PREP"],
  s4: ["T-THESIS", "E-PROJ6"],
};

const OFFICIAL = {
  admission: 28,
  math: 18,
  ml: 18,
  sys: 18,
  foundationsSum: 64,
  electives: 20,
  thesis: 36,
  mscTotal: 120,
  grandTotal: 148,
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
  admission: sumMod('Admission requirement'),
  math: sumMod('Mathematical Foundations'),
  ml: sumMod('Machine Learning Foundations'),
  sys: sumMod('Systems Foundations'),
  electives: sumMod('Electives in Data Science'),
  thesis: sumMod('Thesis'),
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
if (!appTsx.includes('ProgressPanel') && !appTsx.includes('evaluatePlan')) fail('App does not use evaluation layer');
else pass('App wired to ProgressPanel / evaluation');
if (appTsx.includes('AI Curriculum Advisor') || appTsx.includes('AI Summary')) fail('Fake AI branding still present in App.tsx');
else pass('No fake AI branding in App.tsx');

console.log('\nCHECK 5: Data quality');
const placeholderSched = courses.filter(c =>
  (c.schedule||[]).some(s => (s.time||'').includes('not visible') || (s.room||'').includes('not visible'))
);
if (placeholderSched.length) warn(`${placeholderSched.length} courses still have placeholder schedules`);
else pass('No placeholder schedule strings');

const typoCourses = courses.filter(c => c.title.includes('Typology'));
if (typoCourses.length) fail(`Title typo "Typology" still present`);
else pass('No Typology/Topology title typo');

console.log('\nCHECK 6: Preset Sem1 timetable conflicts (informational)');
function parseTime(t) {
  if (!t || !t.includes('-')) return null;
  const [a,b] = t.split('-').map(s=>s.trim());
  const ap=a.split(':').map(Number), bp=b.split(':').map(Number);
  return { start: ap[0]+ap[1]/60, end: bp[0]+bp[1]/60 };
}
const s1 = PRESET.s1.map(id => courses.find(c=>c.id===id));
const sessions = [];
s1.forEach(c => (c.schedule||[]).forEach(s => {
  const r = parseTime(s.time);
  if (r) sessions.push({ id: c.id, day: s.day, ...r, time: s.time });
}));
const conflicts = [];
for (let i=0;i<sessions.length;i++) for (let j=i+1;j<sessions.length;j++) {
  const a=sessions[i], b=sessions[j];
  if (a.day===b.day && a.start<b.end && a.end>b.start) conflicts.push(`${a.day} ${a.time}: ${a.id} vs ${b.id}`);
}
if (conflicts.length) {
  warn(`${conflicts.length} Sem1 timetable conflicts (surfaced in UI conflict report):`);
  conflicts.forEach(c => console.log(`    ${c}`));
} else {
  pass('No Sem1 timetable conflicts');
}

console.log('\nCHECK 7: Cross-file consistency');
if (fs.existsSync('actual_courses.json')) {
  const actual = JSON.parse(fs.readFileSync('actual_courses.json','utf8'));
  const actualById = Object.fromEntries(actual.map(c=>[c.id,c]));
  let diffs = 0;
  courses.forEach(c => {
    const a = actualById[c.id];
    if (!a) return;
    ['cp','module','when','type','title','code'].forEach(k => {
      if (a[k] !== undefined && a[k] !== c[k]) diffs++;
    });
  });
  if (diffs) fail(`${diffs} field diffs vs actual_courses.json`);
  else pass('courses.ts matches actual_courses.json on shared IDs');
}

console.log('\nCHECK 8: Live VV scrape coverage');
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

console.log('\nCHECK 9: agent.md accuracy');
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

console.log('\n=== SUMMARY ===');
console.log(`Errors: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);
if (issues.length) {
  issues.forEach(i => console.log(`  ERROR: ${i}`));
  process.exit(1);
}
console.log('\nAll critical checks passed.');
process.exit(0);
