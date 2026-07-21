const fs = require('fs');

function loadCourses() {
  const code = fs.readFileSync('src/courses.ts', 'utf8');
  return JSON.parse(code.replace('export const COURSES = ', '').replace(/;\s*$/, ''));
}

const courses = loadCourses();
const unibas = fs.existsSync('unibas_courses.json') ? JSON.parse(fs.readFileSync('unibas_courses.json','utf8')) : [];
const actual = fs.existsSync('actual_courses.json') ? JSON.parse(fs.readFileSync('actual_courses.json','utf8')) : [];
const tree = fs.existsSync('tree.json') ? JSON.parse(fs.readFileSync('tree.json','utf8')) : null;

const unibasByCode = Object.fromEntries(unibas.map(c => [String(c.code), c]));
const actualById = Object.fromEntries(actual.map(c => [c.id, c]));

const TEMPLATE_SYLLABUS = [
  'Understand the fundamental concepts of the field.',
  'Apply theoretical knowledge to practical problems.',
  'Analyze and evaluate contemporary research literature.',
];
const TEMPLATE_DESC_PREFIX = 'An intensive course on';

console.log('=== ACTUAL DATA AUDIT: courses.ts ===\n');

// 1. Per-course provenance
const provenance = { scraped: 0, actualOnly: 0, manual: 0, synthetic: 0 };
const dataIssues = [];
const dataWarnings = [];

courses.forEach(c => {
  const isSynthetic = c.code === 'Learning contract' || ['ML-PROJ6','S-PROJ6','E-PROJ6','T-PREP','T-THESIS'].includes(c.id);
  const inScrape = unibasByCode[c.code];
  const inActual = actualById[c.id];

  if (isSynthetic) provenance.synthetic++;
  else if (inScrape) provenance.scraped++;
  else if (inActual) provenance.actualOnly++;
  else provenance.manual++;

  // Template content detection
  const hasTemplateSyllabus = (c.syllabus||[]).some(s => TEMPLATE_SYLLABUS.includes(s));
  const hasTemplateDesc = (c.description||'').startsWith(TEMPLATE_DESC_PREFIX);
  const hasEmptyDesc = !c.description || c.description.trim() === '';
  const hasScrapeGap = (c.description||'').includes('not retrieved') || (c.description||'').includes('did not expose');
  const hasEmptySchedule = !c.schedule || c.schedule.length === 0;

  if (hasTemplateSyllabus) dataWarnings.push(`${c.id}: template syllabus`);
  if (hasTemplateDesc) dataWarnings.push(`${c.id}: template description`);
  if (hasScrapeGap) dataWarnings.push(`${c.id}: incomplete scrape ("${(c.description||'').slice(0,60)}...")`);
  if (!isSynthetic && hasEmptySchedule && inScrape && inScrape.schedule?.length > 0) {
    dataIssues.push(`${c.id}: scrape has schedule but courses.ts is empty`);
  }

  // Cross-check actual_courses.json
  if (inActual) {
    for (const k of ['cp','code','title','module','when','type']) {
      if (inActual[k] !== undefined && inActual[k] !== c[k]) {
        dataIssues.push(`${c.id}: courses.ts ${k}="${c[k]}" vs actual="${inActual[k]}"`);
      }
    }
  }

  // Suspicious codes
  if (!isSynthetic && /^7777[78]$/.test(c.code)) {
    dataWarnings.push(`${c.id}: suspicious code ${c.code} — verify on Vorlesungsverzeichnis`);
  }
});

console.log('PROVENANCE (where did each record come from?)');
console.log(`  Scraped (in unibas_courses.json):  ${provenance.scraped}`);
console.log(`  In actual_courses.json only:       ${provenance.actualOnly}`);
console.log(`  Manual (no scrape, no actual):     ${provenance.manual}`);
console.log(`  Synthetic (learning contracts):    ${provenance.synthetic}`);
console.log(`  TOTAL:                             ${courses.length}`);

// 2. Admission data deep dive
console.log('\n--- ADMISSION DATA (Auflagen) ---');
const adm = courses.filter(c => c.type === 'Admission');
adm.forEach(c => {
  const scraped = unibasByCode[c.code];
  const sched = (c.schedule||[]).length;
  const scrapeSched = (scraped?.schedule||[]).length;
  console.log(`  ${c.id} | ${c.cp} CP | code ${c.code} | ${c.title}`);
  console.log(`         when=${c.when} | schedule=${sched} sessions | scrape=${scraped?'yes':'NO'} | scrapeSched=${scrapeSched}`);
});

const analysis = adm.filter(c => /analysis/i.test(c.title));
const algo = adm.filter(c => /algorithm|data structure/i.test(c.title));
const sci = adm.filter(c => /scientific computing/i.test(c.title));
console.log(`\n  Analysis group:  ${analysis.reduce((s,c)=>s+c.cp,0)} CP (${analysis.map(c=>c.cp).join('+')})`);
console.log(`  Algorithms:      ${algo.reduce((s,c)=>s+c.cp,0)} CP`);
console.log(`  Sci Computing:   ${sci.reduce((s,c)=>s+c.cp,0)} CP`);
console.log(`  TOTAL:           ${adm.reduce((s,c)=>s+c.cp,0)} CP`);
console.log('\n  OFFICIAL EXPECTATION (typical UniBas Auflagen): 10+8+10=28');
console.log('  CATALOG MODELS:                               12+8+8=28');
console.log('  DELTA: Analysis +2 CP, SciComp -2 CP vs typical Auflagen letter');

// 3. CP value audit for non-synthetic courses with numeric codes
console.log('\n--- CP VALUES: courses NOT in scrape (unverified CP) ---');
const unverified = courses.filter(c => c.code !== 'Learning contract' && !unibasByCode[c.code]);
unverified.forEach(c => console.log(`  ${c.id} | code ${c.code} | ${c.cp} CP | ${c.title}`));
console.log(`  Total unverified: ${unverified.length} courses, ${unverified.reduce((s,c)=>s+c.cp,0)} CP`);

// 4. Schedule fidelity for scraped courses
console.log('\n--- SCHEDULE FIDELITY (courses.ts vs unibas scrape) ---');
let schedMatch = 0, schedMismatch = 0, schedMissing = 0;
courses.filter(c => unibasByCode[c.code]).forEach(c => {
  const s = unibasByCode[c.code];
  const a = JSON.stringify(c.schedule||[]);
  const b = JSON.stringify(s.schedule||[]);
  if ((!c.schedule||!c.schedule.length) && s.schedule?.length) { schedMissing++; }
  else if (a === b) schedMatch++;
  else schedMismatch++;
});
console.log(`  Exact match: ${schedMatch}`);
console.log(`  Mismatch:    ${schedMismatch}`);
console.log(`  Missing:     ${schedMissing}`);

if (schedMismatch > 0) {
  courses.filter(c => unibasByCode[c.code]).forEach(c => {
    const s = unibasByCode[c.code];
    if (JSON.stringify(c.schedule||[]) !== JSON.stringify(s.schedule||[])) {
      console.log(`    ${c.id} (${c.code}):`);
      console.log(`      courses.ts: ${JSON.stringify(c.schedule)}`);
      console.log(`      scrape:     ${JSON.stringify(s.schedule)}`);
    }
  });
}

// 5. Description quality
console.log('\n--- DESCRIPTION / SYLLABUS QUALITY ---');
let realDesc = 0, templateDesc = 0, missingDesc = 0, scrapeGap = 0;
let realSyllabus = 0, templateSyllabus = 0, emptySyllabus = 0;
courses.forEach(c => {
  if (!c.description || !c.description.trim()) missingDesc++;
  else if (c.description.startsWith(TEMPLATE_DESC_PREFIX)) templateDesc++;
  else if (c.description.includes('not retrieved') || c.description.includes('did not expose')) scrapeGap++;
  else realDesc++;

  if (!c.syllabus || !c.syllabus.length) emptySyllabus++;
  else if (c.syllabus.some(s => TEMPLATE_SYLLABUS.includes(s))) templateSyllabus++;
  else realSyllabus++;
});
console.log(`  Descriptions: ${realDesc} real, ${templateDesc} template, ${scrapeGap} scrape-failed, ${missingDesc} empty`);
console.log(`  Syllabus:     ${realSyllabus} real, ${templateSyllabus} template, ${emptySyllabus} empty`);

// 6. Module assignment sanity
console.log('\n--- MODULE ASSIGNMENT CHECK ---');
const moduleTypes = {};
courses.forEach(c => {
  const key = `${c.module} / ${c.type}`;
  moduleTypes[key] = (moduleTypes[key] || 0) + 1;
});
Object.entries(moduleTypes).sort().forEach(([k,v]) => console.log(`  ${k}: ${v}`));

const oddAssignments = courses.filter(c => {
  if (c.module.includes('Admission') && c.type !== 'Admission') return true;
  if (c.module.includes('Thesis') && c.type !== 'Thesis') return true;
  if (c.module.includes('Electives') && !['Elective','Project'].includes(c.type)) return true;
  return false;
});
if (oddAssignments.length) {
  console.log('  Odd type/module pairings:');
  oddAssignments.forEach(c => console.log(`    ${c.id}: ${c.module} / ${c.type}`));
}

// 7. tree.json cross-check if available
if (tree) {
  console.log('\n--- tree.json cross-check ---');
  // tree structure unknown - inspect
  const treeStr = JSON.stringify(tree).slice(0, 200);
  console.log(`  tree.json size: ${JSON.stringify(tree).length} chars, preview: ${treeStr}...`);
}

// Summary
console.log('\n=== DATA ISSUES ===');
if (dataIssues.length === 0) console.log('  (none)');
else dataIssues.forEach(i => console.log(`  ERROR: ${i}`));

console.log(`\n=== DATA WARNINGS (${dataWarnings.length}) ===`);
[...new Set(dataWarnings)].slice(0, 30).forEach(w => console.log(`  ${w}`));
if (dataWarnings.length > 30) console.log(`  ... and ${dataWarnings.length - 30} more`);

console.log('\n=== BOTTOM LINE ===');
const verifiedPct = Math.round((provenance.scraped / (courses.length - provenance.synthetic)) * 100);
console.log(`  ${verifiedPct}% of real courses have scrape backing (${provenance.scraped}/${courses.length - provenance.synthetic})`);
console.log(`  ${unverified.length} courses have UNVERIFIED CP values`);
console.log(`  Admission CP model (12+8+8) may not match official Auflagen letter (10+8+10)`);
