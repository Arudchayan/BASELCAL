import type { BucketStatus, RuleKind } from './degreeRules';

export function MetricBox({
  label,
  value,
  target,
  color,
  kind,
  status,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  kind: RuleKind;
  status: BucketStatus;
}) {
  const kindHint = kind === 'exact' ? 'exact' : 'min';
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 100;

  const valueColor =
    status === 'met'
      ? 'var(--text-primary)'
      : status === 'short'
        ? 'var(--warn)'
        : status === 'overshoot'
          ? 'var(--bad)'
          : 'var(--text-muted)';
  const barColor =
    status === 'met'
      ? color
      : status === 'short'
        ? 'var(--warn)'
        : status === 'overshoot'
          ? 'var(--bad)'
          : 'var(--border-strong)';

  return (
    <div className="metric" title={kind === 'exact' ? `Must be exactly ${target} CP` : `Minimum ${target} CP`}>
      <div className="metric-top">
        <span className="micro-label">{label}</span>
        <span className="metric-kind">{kindHint}</span>
      </div>
      <div>
        <span className="metric-value num" style={{ color: valueColor }}>
          {value}
        </span>
        <span className="metric-target">/ {target}</span>
      </div>
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {status === 'overshoot' && (
        <div className="metric-note" style={{ color: 'var(--bad)' }}>
          Overshoot
        </div>
      )}
      {status === 'short' && value > 0 && (
        <div className="metric-note" style={{ color: 'var(--warn)' }}>
          Short
        </div>
      )}
    </div>
  );
}
