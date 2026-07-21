const fs = require('fs');
const c = require('./unique_to_eval2.json');
let batches = [];
let batchSize = 15;
for(let i=0; i<c.length; i+=batchSize) {
  let batch = c.slice(i, i+batchSize).map(x => ({
    TypeName: 'research',
    Role: 'Course Evaluator ' + x.code,
    Prompt: `Evaluate course: ${x.title} (Code: ${x.code}). URL: ${x.url || 'N/A'}. Find overview, syllabus highlights, student feedback/reviews/GitHub repos, and practical tips. Reply to me with a markdown summary.`
  }));
  fs.writeFileSync(`batch_${i/batchSize}.json`, JSON.stringify(batch, null, 2));
}
console.log('Batches created.');
