const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/DELL/.gemini/antigravity-cli/brain/';
const dirs = fs.readdirSync(brainDir);

let allEvals = [];

for (const d of dirs) {
    const transcriptPath = path.join(brainDir, d, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(transcriptPath)) {
        const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            if (!lines[i].trim()) continue;
            try {
                const entry = JSON.parse(lines[i]);
                if (entry.toolCall && entry.toolCall.name === 'default_api:send_message') {
                    const args = entry.toolCall.arguments;
                    if (args && args.Message) {
                        allEvals.push(args.Message);
                        break; // only take the last message sent
                    }
                }
            } catch (e) {}
        }
    }
}

const outPath = path.join(brainDir, '0389484d-2bdc-4101-b440-4b67f2bd5ea1', 'course_evaluations.md');
fs.writeFileSync(outPath, '# Course Evaluations\n\n' + allEvals.join('\n\n---\n\n'));
console.log('Successfully compiled ' + allEvals.length + ' evaluations to ' + outPath);
