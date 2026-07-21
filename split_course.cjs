const fs = require('fs');
let content = fs.readFileSync('src/courses.ts', 'utf8');

const regex = /{[\s\S]*?"id":\s*"AD-10489"[\s\S]*?\]\s*},?/;

const match = content.match(regex);
if (match) {
  const original = match[0];
  
  const part1 = `{
  "id": "AD-10489-1",
  "code": "10489",
  "title": "Main lecture Analysis I",
  "cp": 4,
  "module": "Admission requirement",
  "when": "Fall",
  "lang": "German listed",
  "priority": "Medium",
  "type": "Admission",
  "note": "Part 1 of the annual Analysis course.",
  "url": "https://vorlesungsverzeichnis.unibas.ch/en/details?id=10489",
  "description": "First half of the comprehensive exploration of Analysis.",
  "prerequisites": "Strong foundation in linear algebra and calculus.",
  "exam": "Oral exam (30 min) jointly at end of Spring",
  "lecturer": "Gianluca Crippa",
  "syllabus": [
    "Topological concepts and limits",
    "Differential calculus in several variables"
  ],
  "schedule": [
    {
      "day": "Thursday",
      "time": "08:15 - 10:00",
      "room": "Alte Universität, Hörsaal -101"
    },
    {
      "day": "Friday",
      "time": "08:15 - 10:00",
      "room": "Alte Universität, Hörsaal -101"
    }
  ]
},`;

  const part2 = `{
  "id": "AD-10489-2",
  "code": "10489",
  "title": "Main lecture Analysis II",
  "cp": 4,
  "module": "Admission requirement",
  "when": "Spring",
  "lang": "German listed",
  "priority": "Medium",
  "type": "Admission",
  "note": "Part 2 of the annual Analysis course.",
  "url": "https://vorlesungsverzeichnis.unibas.ch/en/details?id=10489",
  "description": "Second half of the comprehensive exploration of Analysis.",
  "prerequisites": "Completion of Analysis I.",
  "exam": "Oral exam (30 min) covering both parts",
  "lecturer": "Gianluca Crippa",
  "syllabus": [
    "Approximation of functions and integral calculus",
    "Ordinary differential equations and applications"
  ],
  "schedule": [
    {
      "day": "Thursday",
      "time": "08:15 - 10:00",
      "room": "Alte Universität, Hörsaal -101"
    },
    {
      "day": "Friday",
      "time": "08:15 - 10:00",
      "room": "Alte Universität, Hörsaal -101"
    }
  ]
},`;

  content = content.replace(original, part1 + '\n' + part2);
  fs.writeFileSync('src/courses.ts', content);
  console.log('Successfully split AD-10489 into AD-10489-1 and AD-10489-2');
} else {
  console.log('Could not find AD-10489 to replace');
}
