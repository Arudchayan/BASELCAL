const fs = require('fs');
const c = require('./73_courses.json');
for(let i=0; i<c.length; i+=15) {
  let b = c.slice(i, i+15).map(x => ({
    TypeName: 'course_evaluator',
    Role: 'Eval ' + x.id,
    Prompt: `Evaluate ${x.title} (${x.code}). URL: ${x.url || 'N/A'}. Return a concise markdown summary with overview, syllabus, reviews/feedback, practical tips.`
  }));
  fs.writeFileSync(`batch_${i/15}.json`, JSON.stringify(b, null, 2));
}
