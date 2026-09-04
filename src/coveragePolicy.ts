/**
 * App-facing view of coverage_policy.json (single authority for stale watches,
 * module discrepancies, and catalog freshness stamps).
 */
import policy from '../coverage_policy.json';

export type ModuleDiscrepancy = {
  id: string;
  code: string;
  catalogModule: string;
  vvModulesTab: string;
  resolution: string;
  note: string;
};

export type CoveragePolicy = {
  lastVerified: {
    date: string;
    method: string;
    catalogCoursesWithVvDetail: number;
    moduleManifestComplete: boolean;
    fall2026UniqueCourses?: number;
    fall2026ModuleEntries?: number;
    notes: string;
  };
  staleWatchIds: string[];
  moduleDiscrepancies: ModuleDiscrepancy[];
  moduleCrossListings?: Record<string, string[]>;
};

export const COVERAGE_POLICY = policy as CoveragePolicy;

export function getModuleDiscrepancy(courseId: string): ModuleDiscrepancy | undefined {
  return COVERAGE_POLICY.moduleDiscrepancies.find((d) => d.id === courseId);
}

export function isDisputedModule(courseId: string): boolean {
  return !!getModuleDiscrepancy(courseId);
}

export function isStaleWatch(courseId: string): boolean {
  return COVERAGE_POLICY.staleWatchIds.includes(courseId);
}
