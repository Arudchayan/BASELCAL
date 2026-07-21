const fs = require('fs');

const transcript = fs.readFileSync('C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/.system_generated/logs/transcript.jsonl', 'utf8');

// The transcript contains entries that might not be pure JSON, wait, it IS JSONL.
// But some lines might be broken or I can just use a regex over the whole file string.
// Let's match all instances of "content=Here is the evaluation... (or similar) up to </SYSTEM_MESSAGE>"

let evals = [];
const regex = /\[Message\] timestamp=.*?content=(.*?)<\/SYSTEM_MESSAGE>/gs;
let match;
while ((match = regex.exec(transcript)) !== null) {
    let text = match[1].trim();
    if (text.includes('Course Evaluation') || text.includes('Overview')) {
        evals.push(text);
    }
}

const outPath = 'E:/Repos/BASELCAL/course_evaluations.md';
let output = '# Course Evaluations\n\n' + evals.join('\n\n---\n\n');
fs.writeFileSync(outPath, output);
console.log('Extracted', evals.length, 'evaluations.');
