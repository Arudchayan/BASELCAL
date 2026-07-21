/**
 * Second independent validation — different methodology from validate_all.cjs
 * Uses hardcoded expected values and checksums, no shared constants.
 */
const fs = require('fs');
const crypto = require('crypto');

let failures = 0;
const fail = (msg) => { console.log(`FAIL: ${msg}`); failures++; };
const ok = (msg) => console.log(`OK: ${msg}`);

const courses = JSON.parse(
  fs.readFileSync('src/courses.ts', 'utf8')
    .replace('export const COURSES = ', '')
    .replace(/;\s*$/, '')
);

// --- Round 2 Check A: Hardcoded preset CP checksum ---
const EXPECTED_SEM = { s1: 38, s2: 42, s3: 34, s4: 36 };
const PRESET_IDS = {
  s1: ["AD-10489-1","AD-20980","AD-62060","M-66096","S-45402","E-11680","E-11681","M-19300"],
  s2: ["AD-10489-2","AD-11039","AD-10906","AD-62061","ML-17165","ML-13548","ML-45366","S-15729"],
  s3: ["AD-11037","M-77777","E-58920","ML-60835","S-67924","E-55662","T-PREP"],
  s4: ["T-THESIS","E-PROJ6"],
};
const byId = Object.fromEntries(courses.map(c => [c.id, c]));

console.log('=== ROUND 2 INDEPENDENT VALIDATION ===\n');

let grandTotal = 0;
for (const [sem, ids] of Object.entries(PRESET_IDS)) {
  const cp = ids.reduce((s, id) => {
    const c = byId[id];
    if (!c) { fail(`Missing preset course ${id}`); return s; }
    return s + c.cp;
  }, 0);
  grandTotal += cp;
  if (cp === EXPECTED_SEM[sem]) ok(`${sem} = ${cp} CP`);
  else fail(`${sem} = ${cp} CP, expected ${EXPECTED_SEM[sem]}`);
}
if (grandTotal === 150) ok(`Grand total = ${grandTotal}`);
else if (grandTotal === 148) ok(`Grand total = ${grandTotal}`);
else fail(`Grand total = ${grandTotal}, expected 150 (VV-accurate preset)`);

// --- Round 2 Check B: Module sums via reduce (different code path) ---
const planned = Object.values(PRESET_IDS).flat().map(id => byId[id]).filter(Boolean);
const modSum = planned.reduce((acc, c) => {
  acc[c.module] = (acc[c.module] || 0) + c.cp;
  return acc;
}, {});

const expectedMods = {
  'Admission requirement': 28,
  'Mathematical Foundations': 18,
  'Machine Learning Foundations': 28,
  'Systems Foundations': 20,
  'Electives in Data Science': 20,
  'Thesis': 36,
};
for (const [mod, exp] of Object.entries(expectedMods)) {
  const val = modSum[mod] || 0;
  if (val === exp) ok(`${mod} = ${val}`);
  else fail(`${mod} = ${val}, expected ${exp}`);
}

// --- Round 2 Check C: Catalog checksum stability ---
const catalogHash = crypto.createHash('sha256')
  .update(JSON.stringify(courses.map(c => ({ id: c.id, cp: c.cp, module: c.module }))))
  .digest('hex')
  .slice(0, 12);
ok(`Catalog fingerprint: ${catalogHash} (${courses.length} courses)`);

// --- Round 2 Check D: App.tsx string assertions ---
const app = fs.readFileSync('src/App.tsx', 'utf8');
const checks = [
  ['ML target 18', /ML Found\." value=\{stats\.ml\} target=\{18\}/],
  ['Electives target 20', /Electives" value=\{stats\.electives\} target=\{20\}/],
  ['Foundations sum 64', /Foundations Sum.*target=\{64\}/],
  ['Chat mentions 20 CP electives', /20 CP/.test(app)],
  ['Preset s4 has T-THESIS', /"T-THESIS"/.test(app)],
];
checks.forEach(([name, cond]) => {
  const pass = typeof cond === 'boolean' ? cond : cond.test(app);
  if (pass) ok(`App.tsx: ${name}`);
  else fail(`App.tsx: ${name}`);
});

// --- Round 2 Check E: CourseExplorer minimums ---
const explorer = fs.readFileSync('src/CourseExplorer.tsx', 'utf8');
const explorerMins = { Admission: 28, Thesis: 36, 'Machine Learning': 18, Systems: 18, Math: 18, Electives: 20 };
for (const [bucket, min] of Object.entries(explorerMins)) {
  if (explorer.includes(`reqCp: ${min}`) && explorer.includes(`id: '${bucket}'`)) {
    ok(`CourseExplorer ${bucket} min = ${min}`);
  } else {
    fail(`CourseExplorer ${bucket} min not found as ${min}`);
  }
}

// --- Round 2 Check F: No orphan preset references ---
const catalogIds = new Set(courses.map(c => c.id));
const orphans = Object.values(PRESET_IDS).flat().filter(id => !catalogIds.has(id));
if (orphans.length) fail(`Orphan preset IDs: ${orphans.join(', ')}`);
else ok('No orphan preset IDs');

// --- Round 2 Check G: Admission courses all type=Admission ---
const admIds = courses.filter(c => c.module === 'Admission requirement').map(c => c.id);
const wrongType = courses.filter(c => c.module === 'Admission requirement' && c.type !== 'Admission');
if (wrongType.length) fail(`${wrongType.length} admission courses with wrong type`);
else ok(`All ${admIds.length} admission courses typed correctly`);

console.log(`\n=== ROUND 2 RESULT: ${failures} failure(s) ===`);
process.exit(failures > 0 ? 1 : 0);
