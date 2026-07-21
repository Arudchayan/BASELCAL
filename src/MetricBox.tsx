import { statusColor, type BucketStatus, type RuleKind } from './degreeRules';

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
  const displayColor = statusColor(status, color);
  const kindHint = kind === 'exact' ? 'exact' : 'min';

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(128,128,128,0.03)',
        border: `1px solid ${status === 'empty' ? 'var(--border-subtle)' : displayColor}`,
        display: 'flex',
        flexDirection: 'column',
      }}
      title={kind === 'exact' ? `Must be exactly ${target} CP` : `Minimum ${target} CP`}
    >
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: displayColor }}>
        {value}{' '}
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          / {target}
          <span style={{ fontSize: '10px', marginLeft: 4, opacity: 0.8 }}>({kindHint})</span>
        </span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
      {status === 'overshoot' && (
        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: 4 }}>Overshoot</div>
      )}
      {status === 'short' && value > 0 && (
        <div style={{ fontSize: '11px', color: '#d97706', marginTop: 4 }}>Short</div>
      )}
    </div>
  );
}
