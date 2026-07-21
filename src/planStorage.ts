import { COURSES } from './courses';
import {
  ML_PHD_PRESET_IDS,
  SEMESTER_IDS,
  type Course,
  type PlanState,
  type SemesterId,
} from './types';

export const STORAGE_KEYS = {
  /** Bumped to v3 so old local plans are discarded and the new default preset seeds fresh. */
  plan: 'basel-ds-plan-v3',
  planLegacy: 'basel-ds-plan-v2',
  planLegacyV1: 'basel-ds-plan',
  notes: 'basel-ds-notes',
  shortlist: 'basel-ds-shortlist',
  theme: 'basel-ds-theme',
} as const;

export type PlanExport = {
  version: 2;
  exportedAt: string;
  disclaimer: string;
  plan: Record<SemesterId, string[]>;
  notes?: Record<string, string>;
  shortlist?: string[];
};

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

export function rehydratePlan(idMap: Record<string, string[]>): PlanState {
  return rehydratePlanDetailed(idMap).plan;
}

export function rehydratePlanDetailed(idMap: Record<string, string[]>): RehydrateResult {
  const plan: PlanState = { s1: [], s2: [], s3: [], s4: [] };
  const used = new Set<string>();
  const droppedIds: string[] = [];
  const duplicateIds: string[] = [];

  for (const sem of SEMESTER_IDS) {
    const ids = dedupeIds(idMap[sem] || []);
    for (const id of ids) {
      if (used.has(id)) {
        duplicateIds.push(id);
        continue;
      }
      const course = courseById(id);
      if (!course) {
        droppedIds.push(id);
        continue;
      }
      plan[sem].push(course);
      used.add(id);
    }
  }
  return { plan, droppedIds, duplicateIds };
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
  const idMap: Record<string, string[]> = {};

  for (const sem of SEMESTER_IDS) {
    const items = obj[sem];
    if (!Array.isArray(items)) {
      idMap[sem] = [];
      continue;
    }
    idMap[sem] = items
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') {
          return (item as { id: string }).id;
        }
        return null;
      })
      .filter((id): id is string => !!id);
  }

  return rehydratePlanDetailed(idMap);
}

export function loadPlanFromStorage(): PlanState {
  return loadPlanFromStorageDetailed().plan;
}

export function loadPlanFromStorageDetailed(): RehydrateResult {
  try {
    const current = localStorage.getItem(STORAGE_KEYS.plan);
    if (current) {
      const parsed = JSON.parse(current) as Record<string, string[]>;
      return rehydratePlanDetailed(parsed);
    }
    // Do not migrate v2 — that revision had unschedulable packs; seed the new default instead.
    localStorage.removeItem(STORAGE_KEYS.planLegacy);
    localStorage.removeItem(STORAGE_KEYS.planLegacyV1);
  } catch {
    // Corrupt storage — fall through to default preset
  }
  const seeded = rehydratePlanDetailed(ML_PHD_PRESET_IDS);
  savePlanToStorage(seeded.plan);
  return seeded;
}

export function savePlanToStorage(plan: PlanState): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(planToIds(plan)));
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
    version: 2,
    exportedAt: new Date().toISOString(),
    disclaimer: PLAN_DISCLAIMER,
    plan: planToIds(plan),
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

  if (obj.version === 2 && obj.plan && typeof obj.plan === 'object') {
    const { plan, droppedIds, duplicateIds } = rehydratePlanDetailed(obj.plan as Record<string, string[]>);
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
  return rehydratePlan(presetIds);
}
