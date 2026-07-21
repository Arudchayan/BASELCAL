/**
 * Shared visual helpers for module colors and priority badges.
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

export function getPriorityBg(priority: string): string {
  switch (priority) {
    case 'Must':
      return 'rgba(239, 68, 68, 0.15)';
    case 'Very high':
      return 'rgba(139, 92, 246, 0.15)';
    case 'High':
      return 'rgba(59, 130, 246, 0.15)';
    case 'Medium':
      return 'rgba(245, 158, 11, 0.12)';
    default:
      return 'var(--border-subtle)';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Must':
      return '#ef4444';
    case 'Very high':
      return '#c084fc';
    case 'High':
      return '#60a5fa';
    case 'Medium':
      return '#d97706';
    default:
      return 'var(--text-secondary)';
  }
}
