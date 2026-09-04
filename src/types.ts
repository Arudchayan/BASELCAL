import type { COURSES } from './courses';

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

/** ML/PhD starter: 28 admission + 121 MSc = 149 CP (approved 1 CP overshoot)
 * Hands-on / PhD path with schedulability constraints:
 * - Never co-schedule Sci Comp practical (AD-62060) with FDS (S-45402) — both Fri 10–12 mandatory
 * - Defer Math of DS to S3 (avoids Analysis I Thu clash); defer Algorithms to S4 (avoids ML Wed clash)
 * - Analysis practical uses the selected group 05 (Tue 14:15), avoiding the Scientific Computing lecture
 */
export const ML_PHD_PRESET_IDS: Record<SemesterId, string[]> = {
  // 37 CP — fixed, confirmed Fall 2026 selection; do not rebalance this semester.
  s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
  // 37 CP — ML core + RL, causal inference, medical-image DL, and the ML project.
  s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'E-58920', 'ML-60876', 'E-53822', 'E-PROJ6', 'ML-PROJ6'],
  // 37 CP — Math foundations + FDS + Systems project + inverse problems + thesis prep.
  s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-67343', 'T-PREP'],
  // 38 CP — Thesis + remaining individualized admission conditions.
  s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
};

/** Explicit credit choices for cross-listed courses in the ML/PhD preset. */
export const ML_PHD_PRESET_ALLOCATIONS: Partial<Record<string, CourseModule>> = {
  'ML-60876': 'Machine Learning Foundations',
  'ML-67343': 'Machine Learning Foundations',
};

/** Courses selected in the official Fall 2026 semester-program timetable. */
export const FALL_2026_SELECTION_IDS = [
  'AD-10489-1',
  'AD-11037',
  'AD-20980',
  'AD-62060',
  'M-19300',
  'ML-45401',
  'E-55662',
  'E-64323',
  'S-15731',
] as const;

/** Personal working plan: actual Fall 2026 enrollment plus the existing future-semester outline. */
export const CURRENT_PLAN_IDS: Record<SemesterId, string[]> = {
  ...ML_PHD_PRESET_IDS,
  s1: [...FALL_2026_SELECTION_IDS],
};
