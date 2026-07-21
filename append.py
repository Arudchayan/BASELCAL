import os
import sys

msg = os.environ.get('MSG', '')
if not msg:
    sys.exit(0)

artifact_dir = r"C:\Users\DELL\.gemini\antigravity-cli\brain\0389484d-2bdc-4101-b440-4b67f2bd5ea1"
os.makedirs(artifact_dir, exist_ok=True)
filepath = os.path.join(artifact_dir, 'course_evaluations.md')

with open(filepath, 'a', encoding='utf-8') as f:
    f.write(msg + '\n\n---\n\n')

print(f"Appended to {filepath}")
