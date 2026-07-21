import type { COURSES } from './courses';

export type ScheduleSession = { day: string; time: string; room: string };

export type Course = (typeof COURSES)[0] & {
  description?: string;
  prerequisites?: string;
  exam?: string;
  lecturer?: string;
  syllabus?: string[];
  schedule?: ScheduleSession[];
};

export type PlanState = {
  s1: Course[];
  s2: Course[];
  s3: Course[];
  s4: Course[];
};

export type SemesterId = keyof PlanState;

export const SEMESTER_IDS: SemesterId[] = ['s1', 's2', 's3', 's4'];

export const SEMESTERS = [
  { id: 'catalog' as const, title: 'Course Catalog', isDropzone: true },
  { id: 's1' as const, title: 'Sem 1 · Fall 2026', isDropzone: true },
  { id: 's2' as const, title: 'Sem 2 · Spring 2027', isDropzone: true },
  { id: 's3' as const, title: 'Sem 3 · Fall 2027', isDropzone: true },
  { id: 's4' as const, title: 'Sem 4 (Inc. Thesis)', isDropzone: true },
];

export const INITIAL_PLAN: PlanState = {
  s1: [],
  s2: [],
  s3: [],
  s4: [],
};

/** ML/PhD starter: exactly 28 admission + 120 MSc = 148 CP */
export const ML_PHD_PRESET_IDS: Record<SemesterId, string[]> = {
  s1: ['AD-10489-1', 'AD-20980', 'AD-62060', 'M-66096', 'S-45402', 'E-11680', 'E-11681', 'M-19300'],
  // S-15729 (6 CP) keeps Systems at 20 CP alongside ML-78174 (4 CP) replacing ML-60835 (6 CP)
  // E-58920 Causal Inference moved here (spring) from former S3 Fall placement
  s2: ['AD-10489-2', 'AD-11039', 'AD-10906', 'AD-62061', 'ML-17165', 'ML-13548', 'ML-45366', 'S-15729', 'E-58920'],
  s3: ['AD-11037', 'M-77777', 'ML-78174', 'S-67924', 'E-55662', 'T-PREP'],
  s4: ['T-THESIS', 'E-PROJ6'],
};
