/**
 * Known catalog freshness signals for UI / validation.
 * Canonical list: coverage_policy.json → staleWatchIds (keep in sync).
 */
export const DATA_FRESHNESS = {
  catalogNote: 'Catalog synced with vv_scrape_cache; live audit in vv_msc_ds_official.json (2026-07-21).',
  lastReviewed: '2026-07-21',
  /** VV detail pages show semester metadata older than HS/FS 2026 — verify before planning */
  staleWatchIds: [
    'ML-60835',
    'ML-67343',
    'M-22738',
    'M-22740',
    'M-27334',
    'M-27335',
    'M-74781',
    'M-58951',
    'E-58492',
    'E-62229',
    'E-64324',
  ] as string[],
};

export function isStaleWatch(courseId: string): boolean {
  return DATA_FRESHNESS.staleWatchIds.includes(courseId);
}
