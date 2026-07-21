const fs = require('fs');
const path = require('path');

const msgDir = 'C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/.system_generated/messages';
const files = fs.readdirSync(msgDir).filter(f => f.endsWith('.json') && f !== 'read.json');

let allEvals = [];

for (const f of files) {
    try {
        const p = path.join(msgDir, f);
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        // check the payload structure
        // system messages sent to the parent usually have content
        if (data && data.payload) {
             const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
             if (payload.content) {
                 allEvals.push(payload.content);
             } else {
                 allEvals.push(JSON.stringify(payload));
             }
        } else if (data && data.Message) {
            allEvals.push(data.Message);
        } else if (data && data.content) {
            allEvals.push(data.content);
        } else {
            // let's try to stringify the whole thing if not found
            // or maybe it is data.content
            const content = data.content || data.Message || data.payload?.content;
            if (content) {
                allEvals.push(content);
            }
        }
    } catch (e) {
        console.error("Error parsing", f, e);
    }
}

const outPath = path.join('C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1', 'course_evaluations.md');
fs.writeFileSync(outPath, '# Course Evaluations\n\n' + allEvals.join('\n\n---\n\n'));
console.log('Successfully compiled ' + allEvals.length + ' evaluations to ' + outPath);
