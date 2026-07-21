const fs = require('fs');

function load(path, strip) {
  let raw = fs.readFileSync(path, 'utf8');
  if (strip) raw = raw.replace('export const COURSES = ', '').replace(/;\s*$/, '');
  return JSON.parse(raw);
}

const courses = load('src/courses.ts', true);
const c73 = load('73_courses.json', false);
const actual = load('actual_courses.json', false);

const byId = Object.fromEntries(courses.map(c => [c.id, c]));
const c73byId = Object.fromEntries(c73.map(c => [c.id, c]));
const actualById = Object.fromEntries(actual.map(c => [c.id, c]));

console.log('=== CROSS-SOURCE DATA COMPARISON ===\n');

// courses.ts vs 73_courses.json
console.log('--- courses.ts vs 73_courses.json ---');
const in73notTs = c73.filter(c => !byId[c.id]).map(c => c.id);
const inTsnot73 = courses.filter(c => !c73byId[c.id]).map(c => c.id);
console.log(`  In 73_courses only: ${in73notTs.length} ${in73notTs.slice(0,5).join(', ')}`);
console.log(`  In courses.ts only: ${inTsnot73.length} ${inTsnot73.slice(0,5).join(', ')}`);

let cpDiffs = [], fieldDiffs = [];
c73.forEach(c => {
  const t = byId[c.id];
  if (!t) return;
  if (t.cp !== c.cp) cpDiffs.push(`${c.id}: 73=${c.cp} ts=${t.cp}`);
  ['title','module','when','code','type'].forEach(k => {
    if (c[k] !== t[k]) fieldDiffs.push(`${c.id}.${k}: 73="${c[k]}" ts="${t[k]}"`);
  });
});
console.log(`  CP diffs: ${cpDiffs.length}`);
cpDiffs.forEach(d => console.log(`    ${d}`));
console.log(`  Field diffs: ${fieldDiffs.length}`);
fieldDiffs.slice(0, 15).forEach(d => console.log(`    ${d}`));

// Official 2026 program requirements
console.log('\n--- OFFICIAL MSc Data Science 2026 (DATA_SCIENCE_2026.pdf) ---');
const OFFICIAL = {
  'Mathematical Foundations': { min: 18, label: 'at least 18' },
  'Machine Learning Foundations': { min: 18, label: 'at least 18' },
  'Systems Foundations': { min: 18, label: 'at least 18' },
  'Electives in Data Science': { exact: 20, label: '20 (fixed)' },
  'Thesis': { exact: 36, label: '6 prep + 30 thesis' },
};
Object.entries(OFFICIAL).forEach(([mod, r]) => console.log(`  ${mod}: ${r.label}`));

// Preset against OFFICIAL
const PRESET = ["AD-10489-1","AD-11037","AD-20980","AD-62060","M-19300","E-45400","S-15731",
  "AD-10489-2","AD-11039","ML-17165","ML-45366","ML-78174","E-58920","ML-60876",
  "M-66096","M-77777","S-45402","S-PROJ6","ML-PROJ6","T-PREP",
  "T-THESIS","E-PROJ6","AD-10906","AD-62061"];
const preset = PRESET.map(id => byId[id]).filter(Boolean);
const presetMod = {};
preset.forEach(c => { presetMod[c.module] = (presetMod[c.module]||0) + c.cp; });

console.log('\n--- PRESET vs OFFICIAL PROGRAM ---');
for (const [mod, rule] of Object.entries(OFFICIAL)) {
  const val = presetMod[mod] || 0;
  if (rule.min) {
    const ok = val >= rule.min;
    console.log(`  ${mod}: ${val} CP (min ${rule.min}) ${ok ? 'OK' : 'FAIL'}`);
  } else {
    const ok = val === rule.exact;
    console.log(`  ${mod}: ${val} CP (need ${rule.exact}) ${ok ? 'OK' : 'SHORT by ' + (rule.exact - val)}`);
  }
}

// CourseExplorer mins vs official
console.log('\n--- CourseExplorer.tsx mins vs OFFICIAL ---');
const explorerMins = { Math: 16, 'Machine Learning': 16, Systems: 16, Electives: 12 };
Object.entries(explorerMins).forEach(([b, min]) => {
  const official = b === 'Electives' ? 20 : 18;
  const match = min === official;
  console.log(`  ${b}: explorer=${min}, official=${official} ${match ? 'OK' : 'WRONG'}`);
});

// Admission: verify CP against typical UniBas course ECTS
console.log('\n--- ADMISSION CP: catalog vs typical UniBas course weights ---');
const TYPICAL = {
  '10489': { name: 'Analysis I/II Jahreskurs', typical: 8, catalog: 'split 4+4=8' },
  '11037': { name: 'Practical Analysis I', typical: 2, catalog: 2 },
  '11039': { name: 'Practical Analysis II', typical: 2, catalog: 2 },
  '20980': { name: 'Scientific Computing lecture', typical: 6, catalog: 6 },
  '62060': { name: 'SciComp practical', typical: 2, catalog: 2 },
  '10906': { name: 'Algorithms lecture', typical: 6, catalog: 6 },
  '62061': { name: 'Algorithms practical', typical: 2, catalog: 2 },
};
Object.entries(TYPICAL).forEach(([code, t]) => console.log(`  ${code} ${t.name}: typical ${t.typical} CP, catalog ${t.catalog}`));
console.log('  If Auflagen = Analysis(8+2=10) + Algo(8) + SciComp(8) = 26, NOT 28');
console.log('  Catalog counts BOTH practicals + split lectures = 12+8+8 = 28');
console.log('  RISK: AD-11039 (2 CP) may NOT be an Auflage — inflates Analysis by 2 CP');
console.log('  RISK: SciComp may need 10 CP total (6+2+2?) — catalog only has 8');

// Synthetic entries
console.log('\n--- SYNTHETIC / UNVERIFIABLE RECORDS ---');
courses.filter(c => c.code === 'Learning contract').forEach(c => {
  console.log(`  ${c.id}: ${c.title} ${c.cp} CP — no Vorlesungsverzeichnis entry, structurally correct per program`);
});

courses.filter(c => c.code === '77778').forEach(c => {
  console.log(`  ${c.id}: code 77778 — NOT in unibas scrape, NOT findable live, CP=${c.cp} UNVERIFIED`);
});
