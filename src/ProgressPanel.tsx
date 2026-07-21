import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, CheckCircle2, Info } from 'lucide-react';
import { MetricBox } from './MetricBox';
import { evaluatePlan } from './degreeRules';
import { findConflicts } from './conflicts';
import { getPlacementWarnings } from './offering';
import { allPlannedCourses } from './planStorage';
import { DATA_FRESHNESS, isStaleWatch } from './dataFreshness';
import type { PlanState, SemesterId } from './types';
import { SEMESTER_IDS } from './types';

const BUCKET_COLORS: Record<string, string> = {
  admission: '#d97706',
  math: '#10b981',
  ml: '#8b5cf6',
  systems: '#3b82f6',
  foundationsSum: '#6366f1',
  electives: '#06b6d4',
  thesis: 'var(--module-thesis)',
  mscTotal: '#e2e8f0',
  grandTotal: '#f59e0b',
};

export function ProgressPanel({ plan }: { plan: PlanState }) {
  const courses = allPlannedCourses(plan);
  const { stats, buckets, isComplete, issues } = evaluatePlan(courses);

  const displayBuckets = buckets.filter((b) =>
    ['admission', 'math', 'ml', 'systems', 'foundationsSum', 'electives', 'thesis', 'mscTotal'].includes(b.key),
  );

  const placementIssues: string[] = [];
  for (const sem of SEMESTER_IDS) {
    for (const c of plan[sem]) {
      const warns = getPlacementWarnings(c, sem as SemesterId).filter((w) => w.level === 'error');
      for (const w of warns) {
        placementIssues.push(`${c.title} (${sem}): ${w.message}`);
      }
    }
  }

  const allConflicts = SEMESTER_IDS.flatMap((sem) =>
    findConflicts(plan[sem]).map(
      (c) => `${sem.toUpperCase()} ${c.day}: ${c.courseA.title} ↔ ${c.courseB.title}`,
    ),
  );

  const staleInPlan = courses.filter((c) => isStaleWatch(c.id));

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="glass-panel"
      style={{ padding: '24px' }}
    >
      <h2 style={{ fontSize: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={20} color="var(--accent-primary)" />
        Curriculum Progress
      </h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Targets per Uni Basel MSc Data Science 2026 program (admission model 12+8+8=28 — verify your
        Zulassungsbescheid). Exact buckets fail on overshoot; foundations are minimums. Data review:{' '}
        {DATA_FRESHNESS.lastReviewed}.
      </p>

      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {displayBuckets.map((b) => (
          <MetricBox
            key={b.key}
            label={b.label}
            value={b.value}
            target={b.target}
            color={BUCKET_COLORS[b.key] || '#6366f1'}
            kind={b.kind}
            status={b.status}
          />
        ))}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {stats.admission === 28 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px 16px',
              borderRadius: '12px',
              flex: 1,
              minWidth: 220,
            }}
          >
            <CheckCircle2 size={18} /> Admission requirements exactly {stats.admission} CP.
          </div>
        ) : stats.admission > 28 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '12px 16px',
              borderRadius: '12px',
              flex: 1,
              minWidth: 220,
            }}
          >
            <AlertCircle size={18} /> Admission overshoot: {stats.admission} / 28 CP.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#d97706',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '12px 16px',
              borderRadius: '12px',
              flex: 1,
              minWidth: 220,
            }}
          >
            <AlertCircle size={18} /> Missing {28 - stats.admission} ECTS of admission requirements.
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: stats.mscTotal === 120 ? '#10b981' : stats.mscTotal > 120 ? '#ef4444' : 'var(--text-secondary)',
            background: stats.mscTotal === 120 ? 'rgba(16, 185, 129, 0.1)' : 'var(--border-subtle)',
            padding: '12px 16px',
            borderRadius: '12px',
            flex: 1,
            minWidth: 220,
          }}
        >
          <Info size={18} /> MSc ECTS:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {stats.mscTotal} / 120
          </strong>
          {stats.grandTotal !== 148 && (
            <span style={{ marginLeft: 8 }}>(grand {stats.grandTotal}/148)</span>
          )}
        </div>
        {isComplete && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px 16px',
              borderRadius: '12px',
              flex: 1,
              minWidth: 220,
            }}
          >
            <CheckCircle2 size={18} /> All degree buckets satisfied (148 CP).
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Validation issues</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {placementIssues.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#ef4444' }}>
          <strong>Semester offering mismatches</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {placementIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {allConflicts.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#ef4444' }}>
          <strong>Timetable conflicts across plan</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {allConflicts.slice(0, 12).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
            {allConflicts.length > 12 && <li>…and {allConflicts.length - 12} more</li>}
          </ul>
        </div>
      )}

      {staleInPlan.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Verify VV offering before enrolling</strong>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
            {staleInPlan.length} course(s) in your plan have VV semester metadata older than HS/FS 2026
            (irregular or biennial). CP counts still apply; confirm the course runs in your target semester.
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {staleInPlan.map((c) => (
              <li key={c.id}>
                {c.title} ({c.id})
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
