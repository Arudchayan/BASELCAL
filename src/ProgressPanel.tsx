import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, CheckCircle2, Info } from 'lucide-react';
import { MetricBox } from './MetricBox';
import { DEGREE_RULES, evaluatePlan } from './degreeRules';
import { findConflicts, isHardClash } from './conflicts';
import { getPlacementWarnings } from './offering';
import { allPlannedCourses } from './planStorage';
import { DATA_FRESHNESS, isStaleWatch } from './dataFreshness';
import { COVERAGE_POLICY, getModuleDiscrepancy } from './coveragePolicy';
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
  const admissionTarget = DEGREE_RULES.admission.target;
  const mscTarget = DEGREE_RULES.mscTotal.target;
  const grandTarget = DEGREE_RULES.grandTotal.target;

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
    findConflicts(plan[sem]).map((c) => {
      const hard = isHardClash(c.courseA, c.courseB);
      return {
        sem,
        hard,
        text: `${sem.toUpperCase()} ${c.day}: ${c.courseA.title} ↔ ${c.courseB.title}`,
      };
    }),
  );
  const hardConflicts = allConflicts.filter((c) => c.hard);
  const softConflicts = allConflicts.filter((c) => !c.hard);

  const SEM_LOAD_MAX: Record<SemesterId, number> = { s1: 36, s2: 36, s3: 42, s4: 46 };
  const loadIssues = SEMESTER_IDS.flatMap((sem) => {
    const cp = plan[sem].reduce((s, c) => s + c.cp, 0);
    const max = SEM_LOAD_MAX[sem];
    if (cp > max) return [`${sem.toUpperCase()}: ${cp} CP exceeds recommended max ${max}`];
    return [];
  });

  const staleInPlan = courses.filter((c) => isStaleWatch(c.id));
  const disputedInPlan = courses
    .map((c) => ({ course: c, discrepancy: getModuleDiscrepancy(c.id) }))
    .filter((x): x is { course: (typeof courses)[number]; discrepancy: NonNullable<ReturnType<typeof getModuleDiscrepancy>> } =>
      !!x.discrepancy,
    );
  const missingSchedule = courses.filter(
    (c) =>
      c.type !== 'Admission' &&
      c.module !== 'Thesis' &&
      !(c.when || '').toLowerCase().includes('learning contract') &&
      (!c.schedule || c.schedule.length === 0),
  );

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
        Targets per Uni Basel MSc Data Science 2026 program (admission model 12+8+8={admissionTarget} — verify your
        Zulassungsbescheid). Exact buckets fail on overshoot; foundations are minimums. Catalog review:{' '}
        {DATA_FRESHNESS.lastReviewed}
        {!DATA_FRESHNESS.moduleManifestComplete && ' · VV module membership manifest incomplete'}.
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
        {stats.admission === admissionTarget ? (
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
        ) : stats.admission > admissionTarget ? (
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
            <AlertCircle size={18} /> Admission overshoot: {stats.admission} / {admissionTarget} CP.
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
            <AlertCircle size={18} /> Missing {admissionTarget - stats.admission} ECTS of admission requirements.
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color:
              stats.mscTotal === mscTarget ? '#10b981' : stats.mscTotal > mscTarget ? '#ef4444' : 'var(--text-secondary)',
            background: stats.mscTotal === mscTarget ? 'rgba(16, 185, 129, 0.1)' : 'var(--border-subtle)',
            padding: '12px 16px',
            borderRadius: '12px',
            flex: 1,
            minWidth: 220,
          }}
        >
          <Info size={18} /> MSc ECTS:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {stats.mscTotal} / {mscTarget}
          </strong>
          {stats.grandTotal !== grandTarget && (
            <span style={{ marginLeft: 8 }}>
              (grand {stats.grandTotal}/{grandTarget})
            </span>
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
            <CheckCircle2 size={18} /> All degree buckets satisfied ({grandTarget} CP).
          </div>
        )}
        {isComplete && hardConflicts.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#d97706',
              background: 'rgba(217, 119, 6, 0.12)',
              padding: '12px 16px',
              borderRadius: '12px',
              flex: 1,
              minWidth: 220,
            }}
          >
            <AlertCircle size={18} /> CP-complete but has mandatory timetable overlaps — resolve before enrolling.
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

      {loadIssues.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Semester load</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {loadIssues.map((issue, i) => (
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

      {hardConflicts.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#ef4444' }}>
          <strong>Mandatory timetable conflicts</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {hardConflicts.slice(0, 12).map((issue, i) => (
              <li key={i}>{issue.text}</li>
            ))}
            {hardConflicts.length > 12 && <li>…and {hardConflicts.length - 12} more</li>}
          </ul>
        </div>
      )}

      {softConflicts.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Other timetable overlaps</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {softConflicts.slice(0, 8).map((issue, i) => (
              <li key={i}>{issue.text}</li>
            ))}
            {softConflicts.length > 8 && <li>…and {softConflicts.length - 8} more</li>}
          </ul>
        </div>
      )}

      {disputedInPlan.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Disputed module membership (pending program PDF)</strong>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
            Catalog module tags follow the program PDF when known; VV Modules tab may list a different bucket.
            Confirm with Studiensekretariat before counting toward a foundation vs elective.
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {disputedInPlan.map(({ course, discrepancy }) => (
              <li key={course.id}>
                {course.title} ({course.id}): catalog “{discrepancy.catalogModule}” vs VV “{discrepancy.vvModulesTab}”
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingSchedule.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Schedule unknown — conflict check incomplete</strong>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
            These planned courses have no VV timetable slots, so absence of conflicts does not mean they are
            conflict-free.
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {missingSchedule.map((c) => (
              <li key={c.id}>
                {c.title} ({c.id})
              </li>
            ))}
          </ul>
        </div>
      )}

      {staleInPlan.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Verify VV offering before enrolling</strong>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
            {staleInPlan.length} course(s) in your plan have VV semester metadata older than{' '}
            {COVERAGE_POLICY.lastVerified?.date ? 'HS/FS 2026' : 'the current audit window'} (irregular or biennial).
            CP counts still apply; confirm the course runs in your target semester.
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
