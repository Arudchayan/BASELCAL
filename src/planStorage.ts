import { COURSES } from './courses';
import { INITIAL_PLAN, SEMESTER_IDS, type Course, type PlanState, type SemesterId } from './types';

export const STORAGE_KEYS = {
  plan: 'basel-ds-plan-v2',
  planLegacy: 'basel-ds-plan',
  notes: 'basel-ds-notes',
  shortlist: 'basel-ds-shortlist',
  theme: 'basel-ds-theme',
} as const;

export type PlanExport = {
  version: 2;
  exportedAt: string;
  plan: Record<SemesterId, string[]>;
  notes?: Record<string, string>;
  shortlist?: string[];
};

function courseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id) as Course | undefined;
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

export function rehydratePlan(idMap: Record<string, string[]>): PlanState {
  const plan: PlanState = { s1: [], s2: [], s3: [], s4: [] };
  const used = new Set<string>();

  for (const sem of SEMESTER_IDS) {
    const ids = dedupeIds(idMap[sem] || []);
    for (const id of ids) {
      if (used.has(id)) continue;
      const course = courseById(id);
      if (!course) continue;
      plan[sem].push(course);
      used.add(id);
    }
  }
  return plan;
}

export function planToIds(plan: PlanState): Record<SemesterId, string[]> {
  return {
    s1: plan.s1.map((c) => c.id),
    s2: plan.s2.map((c) => c.id),
    s3: plan.s3.map((c) => c.id),
    s4: plan.s4.map((c) => c.id),
  };
}

function migrateLegacyPlan(raw: unknown): PlanState | null {
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

  return rehydratePlan(idMap);
}

export function loadPlanFromStorage(): PlanState {
  try {
    const v2 = localStorage.getItem(STORAGE_KEYS.plan);
    if (v2) {
      const parsed = JSON.parse(v2) as Record<string, string[]>;
      return rehydratePlan(parsed);
    }
    const legacy = localStorage.getItem(STORAGE_KEYS.planLegacy);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = migrateLegacyPlan(parsed);
      if (migrated) {
        savePlanToStorage(migrated);
        localStorage.removeItem(STORAGE_KEYS.planLegacy);
        return migrated;
      }
    }
  } catch {
    // Corrupt storage — fall through to empty plan
  }
  return { ...INITIAL_PLAN, s1: [], s2: [], s3: [], s4: [] };
}

export function savePlanToStorage(plan: PlanState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(planToIds(plan)));
  } catch {
    // Quota / private mode — ignore
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

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
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
    plan: planToIds(plan),
    notes,
    shortlist,
  };
}

export function importPlanPayload(data: unknown): {
  plan: PlanState;
  notes?: Record<string, string>;
  shortlist?: string[];
} | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (obj.version === 2 && obj.plan && typeof obj.plan === 'object') {
    const plan = rehydratePlan(obj.plan as Record<string, string[]>);
    return {
      plan,
      notes: (obj.notes as Record<string, string>) || undefined,
      shortlist: Array.isArray(obj.shortlist) ? (obj.shortlist as string[]) : undefined,
    };
  }

  // Accept bare { s1: [...], ... } id or course maps
  const migrated = migrateLegacyPlan(obj);
  if (migrated) return { plan: migrated };
  return null;
}

export function allPlannedCourses(plan: PlanState): Course[] {
  return [...plan.s1, ...plan.s2, ...plan.s3, ...plan.s4];
}

export function buildPresetPlan(presetIds: Record<SemesterId, string[]>): PlanState {
  return rehydratePlan(presetIds);
}
