import { COURSES } from './courses';
import {
  CURRENT_PLAN_IDS,
  ML_PHD_PRESET_ALLOCATIONS,
  SEMESTER_IDS,
  type Course,
  type CourseModule,
  type PlanState,
  type SemesterId,
  eligibleModulesFor,
} from './types';

export const STORAGE_KEYS = {
  /** v6 persists the selected module allocation for cross-listed courses. */
  plan: 'basel-ds-plan-v6',
  planLegacyV5: 'basel-ds-plan-v5',
  planLegacyV4: 'basel-ds-plan-v4',
  planLegacyV3: 'basel-ds-plan-v3',
  planLegacyV2: 'basel-ds-plan-v2',
  planLegacyV1: 'basel-ds-plan',
  notes: 'basel-ds-notes',
  shortlist: 'basel-ds-shortlist',
  theme: 'basel-ds-theme',
} as const;

export type PlanExport = {
  version: 3;
  exportedAt: string;
  disclaimer: string;
  plan: SerializedPlan;
  notes?: Record<string, string>;
  shortlist?: string[];
};

export type SerializedCourseRef = string | { id: string; allocatedModule?: CourseModule };
export type SerializedPlan = Record<SemesterId, SerializedCourseRef[]>;

export const PLAN_DISCLAIMER =
  'Unofficial personal planner — not an official University of Basel tool. Verify CP rules, module membership, and VV offerings before enrolling.';

const COURSE_BY_ID: Map<string, Course> = new Map(
  COURSES.map((c) => [c.id, c as Course]),
);

function courseById(id: string): Course | undefined {
  return COURSE_BY_ID.get(id);
}

/** Dedupe IDs while preserving first occurrence order */
export function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export type RehydrateResult = {
  plan: PlanState;
  droppedIds: string[];
  /** Same course ID appeared in more than one semester (or twice); later placements skipped */
  duplicateIds: string[];
};

export function rehydratePlan(idMap: Record<string, unknown>): PlanState {
  return rehydratePlanDetailed(idMap).plan;
}

export function rehydratePlanDetailed(idMap: Record<string, unknown>): RehydrateResult {
  const plan: PlanState = { s1: [], s2: [], s3: [], s4: [] };
  const used = new Set<string>();
  const usedProjectGroups = new Set<string>();
  const droppedIds: string[] = [];
  const duplicateIds: string[] = [];

  for (const sem of SEMESTER_IDS) {
    const rawItems = Array.isArray(idMap[sem]) ? idMap[sem] as unknown[] : [];
    for (const item of rawItems) {
      const id = typeof item === 'string'
        ? item
        : item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
          ? (item as { id: string }).id
          : '';
      if (!id) continue;
      if (used.has(id)) {
        duplicateIds.push(id);
        continue;
      }
      const course = courseById(id);
      if (!course) {
        droppedIds.push(id);
        continue;
      }
      if (course.projectVariantGroup && usedProjectGroups.has(course.projectVariantGroup)) {
        duplicateIds.push(id);
        continue;
      }
      const requestedAllocation = typeof item === 'object' && item
        ? (item as { allocatedModule?: unknown }).allocatedModule
        : undefined;
      const allocatedModule = typeof requestedAllocation === 'string' &&
        eligibleModulesFor(course).includes(requestedAllocation as CourseModule)
        ? requestedAllocation as CourseModule
        : undefined;
      plan[sem].push(allocatedModule ? { ...course, allocatedModule } : course);
      used.add(id);
      if (course.projectVariantGroup) usedProjectGroups.add(course.projectVariantGroup);
    }
  }
  return { plan, droppedIds, duplicateIds };
}

function applyPresetAllocations(idMap: Record<SemesterId, string[]>): Record<SemesterId, SerializedCourseRef[]> {
  const withAllocation = (id: string): SerializedCourseRef => {
    const allocatedModule = ML_PHD_PRESET_ALLOCATIONS[id];
    return allocatedModule ? { id, allocatedModule } : id;
  };
  return {
    s1: idMap.s1.map(withAllocation),
    s2: idMap.s2.map(withAllocation),
    s3: idMap.s3.map(withAllocation),
    s4: idMap.s4.map(withAllocation),
  };
}

export function planToRefs(plan: PlanState): SerializedPlan {
  const serialize = (course: Course): SerializedCourseRef => course.allocatedModule
    ? { id: course.id, allocatedModule: course.allocatedModule }
    : course.id;
  return {
    s1: plan.s1.map(serialize),
    s2: plan.s2.map(serialize),
    s3: plan.s3.map(serialize),
    s4: plan.s4.map(serialize),
  };
}

export function planToIds(plan: PlanState): Record<SemesterId, string[]> {
  return {
    s1: plan.s1.map((c) => c.id),
    s2: plan.s2.map((c) => c.id),
    s3: plan.s3.map((c) => c.id),
    s4: plan.s4.map((c) => c.id),
  };
}

function migrateLegacyPlan(raw: unknown): RehydrateResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const idMap: Record<string, unknown> = {};

  for (const sem of SEMESTER_IDS) {
    const items = obj[sem];
    if (!Array.isArray(items)) {
      idMap[sem] = [];
      continue;
    }
    idMap[sem] = items;
  }

  return rehydratePlanDetailed(idMap);
}

const PREVIOUS_DEFAULT_PLAN_IDS: Record<SemesterId, string[]> = {
  s1: ['AD-10489-1', 'AD-11037', 'AD-20980', 'AD-62060', 'M-19300', 'ML-45401', 'E-55662', 'E-64323', 'S-15731'],
  s2: ['AD-10489-2', 'AD-11039', 'ML-17165', 'ML-78174', 'S-15728', 'E-58920', 'ML-60876', 'E-49935', 'E-PROJ6'],
  s3: ['M-66096', 'M-77777', 'S-45402', 'S-PROJ6', 'ML-PROJ6', 'T-PREP'],
  s4: ['T-THESIS', 'AD-10906', 'AD-62061'],
};

function isPreviousDefaultPlan(raw: Record<string, unknown>): boolean {
  return SEMESTER_IDS.every((sem) => {
    const items = Array.isArray(raw[sem]) ? raw[sem] as unknown[] : [];
    const ids = items.map((item) => typeof item === 'string'
      ? item
      : item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'
        ? (item as { id: string }).id
        : '');
    return JSON.stringify(ids) === JSON.stringify(PREVIOUS_DEFAULT_PLAN_IDS[sem]);
  });
}

export function loadPlanFromStorageDetailed(): RehydrateResult {
  try {
    const current = localStorage.getItem(STORAGE_KEYS.plan);
    if (current) {
      const parsed = JSON.parse(current) as Record<string, unknown>;
      if (isPreviousDefaultPlan(parsed)) {
        const revised = rehydratePlanDetailed(applyPresetAllocations(CURRENT_PLAN_IDS));
        savePlanToStorage(revised.plan);
        return revised;
      }
      return rehydratePlanDetailed(parsed);
    }
    const legacyV5 = localStorage.getItem(STORAGE_KEYS.planLegacyV5);
    if (legacyV5) {
      const migrated = migrateLegacyPlan(JSON.parse(legacyV5));
      if (migrated) {
        savePlanToStorage(migrated.plan);
        return migrated;
      }
    }
    // Earlier revisions used obsolete provisional/preset selections; seed the confirmed current plan instead.
    localStorage.removeItem(STORAGE_KEYS.planLegacyV4);
    localStorage.removeItem(STORAGE_KEYS.planLegacyV3);
    localStorage.removeItem(STORAGE_KEYS.planLegacyV2);
    localStorage.removeItem(STORAGE_KEYS.planLegacyV1);
  } catch {
    // Corrupt storage — fall through to default preset
  }
  const seeded = rehydratePlanDetailed(applyPresetAllocations(CURRENT_PLAN_IDS));
  savePlanToStorage(seeded.plan);
  return seeded;
}

export function savePlanToStorage(plan: PlanState): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(planToRefs(plan)));
    return true;
  } catch {
    return false;
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function exportPlanPayload(
  plan: PlanState,
  notes: Record<string, string>,
  shortlist: string[],
): PlanExport {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    disclaimer: PLAN_DISCLAIMER,
    plan: planToRefs(plan),
    notes,
    shortlist,
  };
}

export function importPlanPayload(data: unknown): {
  plan: PlanState;
  notes?: Record<string, string>;
  shortlist?: string[];
  droppedIds: string[];
  duplicateIds: string[];
} | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if ((obj.version === 3 || obj.version === 2) && obj.plan && typeof obj.plan === 'object') {
    const { plan, droppedIds, duplicateIds } = rehydratePlanDetailed(obj.plan as Record<string, unknown>);
    return {
      plan,
      notes: (obj.notes as Record<string, string>) || undefined,
      shortlist: Array.isArray(obj.shortlist) ? (obj.shortlist as string[]) : undefined,
      droppedIds,
      duplicateIds,
    };
  }

  // Accept bare { s1: [...], ... } id or course maps
  const migrated = migrateLegacyPlan(obj);
  if (migrated) {
    return {
      plan: migrated.plan,
      droppedIds: migrated.droppedIds,
      duplicateIds: migrated.duplicateIds,
    };
  }
  return null;
}

export function allPlannedCourses(plan: PlanState): Course[] {
  return [...plan.s1, ...plan.s2, ...plan.s3, ...plan.s4];
}

export function buildPresetPlan(presetIds: Record<SemesterId, string[]>): PlanState {
  return rehydratePlan(applyPresetAllocations(presetIds));
}
