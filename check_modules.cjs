const fs = require('fs');
const code = fs.readFileSync('src/courses.ts', 'utf8');
const titles = [...code.matchAll(/title:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const modules = [...code.matchAll(/module:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

const courses = [];
for (let i = 0; i < titles.length; i++) {
  courses.push({ title: titles[i], module: modules[i] });
}

const dupes = [];
for (let i = 0; i < courses.length; i++) {
  for (let j = i + 1; j < courses.length; j++) {
    if (courses[i].title === courses[j].title) {
      dupes.push(courses[i].title);
    }
  }
}

console.log('Duplicates:', dupes);

const allModules = [...new Set(modules)];
console.log('Unique Modules:', allModules);
