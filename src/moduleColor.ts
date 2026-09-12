/**
 * Single home for module/bucket accent colors (plan step 45/48).
 *
 * `getModuleColor` maps a catalog module string to the canonical
 * `var(--module-*)` token. It was previously copy-pasted in CourseCard and
 * Timetable; both now import it from here. Matching is substring-based on
 * purpose: module names are free-form VV strings, so exact matching would
 * silently fall through.
 *
 * `bucketColor` maps a rule-bucket key to one accent. Module buckets resolve
 * to the same existing `var(--module-*)` tokens (which are theme-aware —
 * hardcoded hexes were not, so they broke in dark mode). The three total
 * keys (foundationsSum/mscTotal/grandTotal) are not modules, so they keep
 * their long-standing hex values here instead of inventing new mappings.
 * No CSS variables were renamed and no status colors were touched.
 */
export function getModuleColor(moduleName: string): string {
  if (moduleName.includes('Admission')) return 'var(--module-admission)';
  if (moduleName.includes('Math')) return 'var(--module-math)';
  if (moduleName.includes('Machine Learning')) return 'var(--module-ml)';
  if (moduleName.includes('Systems')) return 'var(--module-systems)';
  if (moduleName.includes('Electives')) return 'var(--module-electives)';
  if (moduleName.includes('Thesis')) return 'var(--module-thesis)';
  return 'var(--text-secondary)';
}

export function bucketColor(bucketKey: string): string {
  switch (bucketKey) {
    case 'admission':
      return 'var(--module-admission)';
    case 'math':
      return 'var(--module-math)';
    case 'ml':
      return 'var(--module-ml)';
    case 'systems':
      return 'var(--module-systems)';
    case 'electives':
      return 'var(--module-electives)';
    case 'thesis':
      return 'var(--module-thesis)';
    case 'foundationsSum':
      return '#6366f1';
    case 'mscTotal':
      return '#e2e8f0';
    case 'grandTotal':
      return '#f59e0b';
    default:
      return '#6366f1';
  }
}
