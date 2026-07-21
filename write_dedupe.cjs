const fs = require('fs');

const code = fs.readFileSync('src/courses.ts', 'utf8');

// We will parse the module COURSES array safely using eval or by modifying the text
let newCode = code;

const duplicateIDsToRemove = [
  'E-12246', // Numerical Methods
  'E-13358', 
  'E-16948',
  'E-19300', // Random Processes
  'E-22738', 
  'E-22740', 
  'E-27334', 
  'E-27335', 
  'E-66096', 
  'E-74781', 
  'E-78105', 
  'E-58951', 
  'E-77600', 
  'E-79161', 
  'E-77777', // Randomized Algorithms
  'E-13548',
  'E-78174',
  'E-17165',
  'E-45366',
  'E-45401', // Bioinformatics Algorithms
  'E-60835',
  'E-60876', // Mathematical and Computational Bio
  'E-66937', // Foundations of Deep Learning
  'E-67343', // Inverse Problems
  'E-77778',
  'E-PROJ6', // Machine Learning Project
  'E-PROJ12',
  'E-13936',
  'E-22687',
  'E-22688',
  'E-41221',
  'E-60600',
  'E-60601',
  'E-66952',
  'E-67123', // Multimedia Retrieval
  'E-74892', // Privacy-Preserving
  'E-SYSPROJ6', // Systems Project
  'E-SYSPROJ12',
  'E-DSPROJ6', // Data Science Project
  'E-DSPROJ12'
];

let finalCode = newCode;
// We'll use a regex to remove any object that has an ID in duplicateIDsToRemove.
// This requires careful regex or parsing.
// Actually, it's easier to run a script that imports COURSES, filters them, and rewrites the file.

const script = `
import { COURSES } from './src/courses.ts';
import fs from 'fs';

const uniqueCourses = [];
const seenTitles = new Set();

for (const c of COURSES) {
  if (!seenTitles.has(c.title)) {
    uniqueCourses.push(c);
    seenTitles.add(c.title);
  } else {
    // If it's a duplicate, we only keep the FIRST one we saw (which is usually the Math/ML/System one, not Electives)
  }
}

const fileContent = "export const COURSES = " + JSON.stringify(uniqueCourses, null, 2) + ";";
fs.writeFileSync('src/courses.ts', fileContent);
`;

fs.writeFileSync('dedupe.js', script);
