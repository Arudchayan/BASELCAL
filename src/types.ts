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
  { id: 's1' as const, title: 'Sem 1 · Fall 2026' },
  { id: 's2' as const, title: 'Sem 2 · Spring 2027' },
  { id: 's3' as const, title: 'Sem 3 · Fall 2027' },
  { id: 's4' as const, title: 'Sem 4 (Inc. Thesis)' },
];

/** ML/PhD starter: exactly 28 admission + 120 MSc = 148 CP
 * Hands-on / PhD path with schedulability constraints:
 * - Never co-schedule Sci Comp practical (AD-62060) with FDS (S-45402) — both Fri 10–12 mandatory
 * - Defer Math of DS to S3 (avoids Analysis I Thu clash); defer Algorithms to S4 (avoids ML Wed clash)
 * - Only remaining VV clash: AD-11037 vs AD-20980 (Tue) — both required admission, same slot
 */
export const ML_PHD_PRESET_IDS: Record<SemesterId, string[]> = {
  // 32 CP — admission + light math filler + Planning + Multimedia Retrieval (Fri pm, after Sci Comp)
  s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'E-45400', 'S-15731'],
  // 32 CP — Analysis II + ML core/seminar/RL + Causal; no Algorithms (moved to S4)
  s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-45366', 'ML-78174', 'E-58920', 'ML-60876'],
  // 40 CP — Math foundations + FDS (safe: Sci Comp done) + learning-contract projects + thesis prep
  s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-PROJ6', 'T-PREP'],
  // 44 CP — Thesis + DS project + Algorithms admission (avoids S2 clash with Machine Learning)
  s4: ['T-THESIS', 'E-PROJ6', 'AD-10906', 'AD-62061'],
};
