import type { COURSES } from './courses';
import examplePlan from './examplePlan.json';

export type ScheduleSession = { day: string; time: string; room: string };

export type ScheduleStatus = 'scheduled' | 'contract' | 'thesis' | 'unknown';

export const COURSE_MODULES = [
  'Admission requirement',
  'Mathematical Foundations',
  'Machine Learning Foundations',
  'Systems Foundations',
  'Electives in Data Science',
  'Thesis',
] as const;

export type CourseModule = (typeof COURSE_MODULES)[number];

export type Course = Omit<(typeof COURSES)[0], 'scheduleStatus'> & {
  description?: string;
  prerequisites?: string;
  exam?: string;
  lecturer?: string;
  syllabus?: string[];
  schedule?: ScheduleSession[];
  scheduleStatus?: ScheduleStatus;
  provenance?: { lastVerified?: string; source?: string; stale?: boolean };
  verifiedAt?: string;
  /** Official modules in which this course may be credited. `module` remains the default. */
  eligibleModules?: readonly CourseModule[];
  /** The student's selected credit allocation; present only on a planned course. */
  allocatedModule?: CourseModule;
  /** Mutually exclusive variants of the same learning-contract project. */
  projectVariantGroup?: 'ml-project' | 'systems-project' | 'data-science-project';
};

export function eligibleModulesFor(course: Course): readonly CourseModule[] {
  const primary = course.module as CourseModule;
  return course.eligibleModules?.length ? course.eligibleModules : [primary];
}

export function creditModule(course: Course): CourseModule {
  return course.allocatedModule ?? (course.module as CourseModule);
}

export function withCourseAllocation(course: Course, module: CourseModule): Course {
  if (!eligibleModulesFor(course).includes(module)) return course;
  return { ...course, allocatedModule: module };
}

export type PlanState = {
  s1: Course[];
  s2: Course[];
  s3: Course[];
  s4: Course[];
};

export type SemesterId = keyof PlanState;

export const SEMESTER_IDS: SemesterId[] = ['s1', 's2', 's3', 's4'];

export const SEMESTERS = [
  { id: 's1' as const, title: 'Sem 1 · Fall 2026' },
  { id: 's2' as const, title: 'Sem 2 · Spring 2027 · provisional' },
  { id: 's3' as const, title: 'Sem 3 · Fall 2027 · provisional' },
  { id: 's4' as const, title: 'Sem 4 · provisional (Inc. Thesis)' },
];

/**
 * Single source for honest per-semester load caps (plan step 47).
 * Defined in ./offering (JSON-free, require()-able from the Node validators —
 * see plan step 52); re-exported here so app code keeps one import site.
 * Values are caps on planned CP per semester, not degree rules — the 120CP
 * exact math is untouched.
 */
export { SEM_LOAD_MAX } from './offering';

/** Public sample outline — not a personal enrollment and not an official recommendation. */
export const EXAMPLE_PLAN_IDS: Record<SemesterId, string[]> = examplePlan.plan as Record<SemesterId, string[]>;
export const EXAMPLE_PLAN_ALLOCATIONS: Partial<Record<string, CourseModule>> =
  examplePlan.allocations as Partial<Record<string, CourseModule>>;
export const EXAMPLE_PLAN_ADMISSION_TARGET = examplePlan.admissionTarget;
export const EXAMPLE_PLAN_NAME = examplePlan.name;
