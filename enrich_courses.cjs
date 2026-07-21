const fs = require('fs');

const code = fs.readFileSync('src/courses.ts', 'utf8');
const jsonStr = code.replace('export const COURSES = ', '').replace(/;\s*$/, '');
const courses = JSON.parse(jsonStr);

function generateDescription(title) {
  const lower = title.toLowerCase();
  if (lower.includes('machine learning')) return `Advanced topics in ${title}, covering state-of-the-art algorithms, theoretical foundations, and practical implementations.`;
  if (lower.includes('deep learning')) return `Comprehensive exploration of deep neural networks, including architectures, optimization techniques, and applications in ${title.replace('Foundations of ', '')}.`;
  if (lower.includes('data science')) return `In-depth study of methodologies and tools for data science, focusing on real-world datasets and analytical problem-solving.`;
  if (lower.includes('algorithms')) return `Rigorous analysis of algorithms and data structures, focusing on complexity, design paradigms, and optimization.`;
  if (lower.includes('math') || lower.includes('calculus') || lower.includes('differential') || lower.includes('probability') || lower.includes('stochastic') || lower.includes('analysis')) return `Mathematical foundations required for advanced computational science, covering key theorems, proofs, and applications.`;
  if (lower.includes('network') || lower.includes('system')) return `Foundations of scalable systems and networks, exploring architecture, protocols, and performance evaluation.`;
  if (lower.includes('project')) return `An independent research or engineering project conducted under the supervision of a faculty member.`;
  if (lower.includes('thesis')) return `Final master's thesis involving original research, culminating in a written dissertation and oral defense.`;
  return `An intensive course on ${title}, providing students with theoretical knowledge and practical skills necessary for advanced research and industry application.`;
}

function generateSyllabus(title) {
  const lower = title.toLowerCase();
  if (lower.includes('machine learning') || lower.includes('ai') || lower.includes('artificial intelligence')) {
    return [
      "Understand and implement core algorithms.",
      "Evaluate model performance and mitigate overfitting.",
      "Deploy models to production environments."
    ];
  }
  if (lower.includes('math') || lower.includes('analysis') || lower.includes('probability') || lower.includes('differential') || lower.includes('stochastic')) {
    return [
      "Master fundamental mathematical theorems.",
      "Apply theoretical concepts to solve complex equations.",
      "Develop rigorous mathematical proofs."
    ];
  }
  if (lower.includes('system') || lower.includes('network') || lower.includes('database')) {
    return [
      "Design and evaluate scalable architectures.",
      "Understand low-level protocols and data management.",
      "Optimize performance for high-throughput applications."
    ];
  }
  if (lower.includes('project') || lower.includes('thesis')) {
    return [
      "Conduct independent literature review.",
      "Formulate a novel research question or engineering goal.",
      "Present findings in a structured scientific report."
    ];
  }
  return [
    "Understand the fundamental concepts of the field.",
    "Apply theoretical knowledge to practical problems.",
    "Analyze and evaluate contemporary research literature."
  ];
}

function generatePrerequisites(title) {
  const lower = title.toLowerCase();
  if (lower.includes('advanced') || lower.includes('deep learning') || lower.includes('project') || lower.includes('thesis')) {
    return "Requires completion of foundational modules and consent of instructor.";
  }
  if (lower.includes('machine learning') || lower.includes('data science') || lower.includes('ai')) {
    return "Basic programming skills (Python/R) and linear algebra.";
  }
  if (lower.includes('system') || lower.includes('network') || lower.includes('algorithms')) {
    return "Proficiency in C/C++ or Java, and discrete mathematics.";
  }
  return "None specifically required, but general bachelor-level background is assumed.";
}

for (const c of courses) {
  if (!c.description || c.description.trim() === '') {
    c.description = generateDescription(c.title);
  }
  if (!c.syllabus || c.syllabus.length === 0) {
    c.syllabus = generateSyllabus(c.title);
  }
  if (!c.prerequisites || c.prerequisites.trim() === '') {
    c.prerequisites = generatePrerequisites(c.title);
  }
}

const fileContent = "export const COURSES = " + JSON.stringify(courses, null, 2) + ";\n";
fs.writeFileSync('src/courses.ts', fileContent);
console.log('Successfully enriched all courses!');
