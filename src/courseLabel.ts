import type { Course } from './types';

/** VV `code` is free-text in the catalog: 8 learning-contract rows reuse "Learning contract". */
export function isSyntheticCode(course: Pick<Course, 'code'>): boolean {
  return course.code.trim().toLowerCase() === 'learning contract';
}

/** Short code for badges, ICS, compact rows. Synthetic rows show Contract + CP elsewhere. */
export function displayCode(course: Pick<Course, 'code' | 'cp'>): string {
  if (isSyntheticCode(course)) return 'Contract';
  return course.code;
}

/** Full unambiguous label: Title (CODE). Contract titles already carry CP variants. */
export function courseFullLabel(course: Pick<Course, 'code' | 'title'>): string {
  if (isSyntheticCode(course)) return `${course.title} (Contract)`;
  return `${course.title} (${course.code})`;
}

/** Compact label for tight rows: CODE — Title. */
export function courseShortLabel(course: Pick<Course, 'code' | 'title'>): string {
  if (isSyntheticCode(course)) return `${course.title}`;
  return `${course.code} — ${course.title}`;
}
