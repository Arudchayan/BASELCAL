/**
 * Known catalog freshness signals for UI / validation.
 * Canonical stale list: coverage_policy.json → staleWatchIds.
 */
import { COVERAGE_POLICY } from './coveragePolicy';

export const DATA_FRESHNESS = {
  catalogNote:
    'Catalog synced with vv_scrape_cache; live audit in vv_msc_ds_official.json.',
  lastReviewed: COVERAGE_POLICY.lastVerified.date,
  staleWatchIds: COVERAGE_POLICY.staleWatchIds,
  moduleManifestComplete: COVERAGE_POLICY.lastVerified.moduleManifestComplete,
};

export function isStaleWatch(courseId: string): boolean {
  return DATA_FRESHNESS.staleWatchIds.includes(courseId);
}
