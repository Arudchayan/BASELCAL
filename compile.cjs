const fs = require('fs');
const transcriptPath = 'C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/.system_generated/logs/transcript.jsonl';
const artifactPath = 'C:/Users/DELL/.gemini/antigravity-cli/brain/0389484d-2bdc-4101-b440-4b67f2bd5ea1/course_evaluations.md';

const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
let compiledContent = '# Course Evaluations\n\n';
let count = 0;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    // Look for tool output or system messages containing the evaluations
    // Actually the messages are sent as User messages with <SYSTEM_MESSAGE> in them
    if (entry.role === 'user' && entry.content && typeof entry.content === 'string') {
      const parts = entry.content.split('<SYSTEM_MESSAGE>');
      for (let i = 1; i < parts.length; i++) {
        const msgPart = parts[i].split('</SYSTEM_MESSAGE>')[0];
        if (msgPart.includes('[Message]') && msgPart.includes('content=')) {
          const contentIdx = msgPart.indexOf('content=');
          let text = msgPart.substring(contentIdx + 8).trim();
          compiledContent += text + '\n\n---\n\n';
          count++;
        }
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
}

fs.writeFileSync(artifactPath, compiledContent);
console.log('Compiled', count, 'evaluations into', artifactPath);
