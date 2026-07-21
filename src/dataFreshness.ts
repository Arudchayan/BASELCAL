/**
 * Known catalog freshness signals for UI / validation.
 * Update when re-scraping VV for HS26/FS26.
 */
export const DATA_FRESHNESS = {
  catalogNote: 'Catalog synced with vv_scrape_cache (prefer VV over archived scrapes).',
  lastReviewed: '2026-07-21',
  /** Courses whose VV cache semester may be older than HS26/FS26 — verify before relying on rooms/times */
  staleWatchIds: [
    'ML-60835', // Machine Learning on Graphs (irregular / older cache semester)
    'ML-67343', // Computational Aspects and ML (irregular)
    'ML-66937', // Foundations of Deep Learning (irregular)
    'ML-77778', // Generative Modeling (irregular)
  ] as string[],
};

export function isStaleWatch(courseId: string): boolean {
  return DATA_FRESHNESS.staleWatchIds.includes(courseId);
}
