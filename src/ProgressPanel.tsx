import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BookOpen, CheckCircle2, Info } from 'lucide-react';
import { MetricBox } from './MetricBox';
import { DEGREE_RULES, evaluatePlan } from './degreeRules';
import { findConflicts, isHardClash } from './conflicts';
import { getPlacementWarnings } from './offering';
import { allPlannedCourses } from './planStorage';
import { COVERAGE_POLICY, isStaleWatch, getModuleDiscrepancy } from './coveragePolicy';
import type { Course, PlanState, SemesterId } from './types';
import { creditModule, SEMESTER_IDS } from './types';

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

const BREAKDOWN_KEYS = ['admission', 'math', 'ml', 'systems', 'electives', 'thesis'] as const;

export function ProgressPanel({
  plan,
  courses: providedCourses,
  admissionTarget,
}: {
  plan: PlanState;
  courses?: Course[];
  admissionTarget: number;
}) {
  const [showAllConflicts, setShowAllConflicts] = useState(false);
  const courses = providedCourses ?? allPlannedCourses(plan);
  const { stats, buckets, isComplete, issues, rules } = evaluatePlan(courses, admissionTarget);
  const mscTarget = rules.mscTotal.target;
  const grandTarget = rules.grandTotal.target;

  const displayBuckets = buckets.filter((b) =>
    (b.key !== 'admission' || admissionTarget > 0) &&
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
    findConflicts(plan[sem]).map((pair) => {
      return {
        sem,
        ...pair,
        hard: isHardClash(pair.courseA, pair.courseB),
      };
    }),
  );
  const hardConflicts = allConflicts.filter((c) => c.hard);
  const softConflicts = allConflicts.filter((c) => !c.hard);
  const visibleHardConflicts = showAllConflicts ? hardConflicts : hardConflicts.slice(0, 12);
  const visibleSoftConflicts = showAllConflicts ? softConflicts : softConflicts.slice(0, 8);
  const hasHiddenConflicts = hardConflicts.length > 12 || softConflicts.length > 8;

  const bucketBreakdown = BREAKDOWN_KEYS.map((key) => ({
    key,
    bucket: buckets.find((b) => b.key === key),
    courses: courses.filter((course) => creditModule(course) === DEGREE_RULES[key].module),
  }));

  const SEM_LOAD_MAX: Record<SemesterId, number> = { s1: 37, s2: 38, s3: 42, s4: 46 };
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
  const hasProvisionalRl = courses.some((c) => c.id === 'ML-78174');
  const hasProvisionalRandomizedAlgorithms = courses.some((c) => c.id === 'M-77777');
  const taughtCourseCp = (semesterCourses: Course[]) => semesterCourses
    .filter((c) => c.type !== 'Admission' && c.module !== 'Thesis')
    .reduce((sum, c) => sum + c.cp, 0);
  const taughtBeforeS4 = (['s1', 's2', 's3'] as SemesterId[])
    .reduce((sum, sem) => sum + taughtCourseCp(plan[sem]), 0);
  const remainingTaughtInS4 = taughtCourseCp(plan.s4);
  const hasThesisInS4 = plan.s4.some((c) => c.id === 'T-THESIS');

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
        Degree targets follow the Uni Basel MSc Data Science 2026 programme. Admission (Auflagen) is
        student-specific — currently {admissionTarget} CP, set from your letter (0 means none). Exact buckets fail
        on overshoot; foundations are minimums. Catalog review:{' '}
        {COVERAGE_POLICY.lastVerified.date}
        {!COVERAGE_POLICY.lastVerified.moduleManifestComplete && ' · VV module membership manifest incomplete'}.
      </p>

      <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--warn-bg)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--warn)' }}>Provisional from Spring 2027 onward.</strong>{' '}
        Future offerings and timetable slots have not been audited against their live VV semesters. Recheck before
        enrollment.
        {hasProvisionalRl && ' ML-78174 Reinforcement Learning is irregular and must be confirmed.'}
        {hasProvisionalRandomizedAlgorithms && ' M-77777 Randomized Algorithms is irregular and must be confirmed.'}
      </div>

      {hasThesisInS4 && (
        <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'var(--accent-glow)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent-primary)' }}>Thesis gate:</strong>{' '}
          {taughtBeforeS4} taught-module CP are complete before Semester 4 (76 CP required to start).
          {' '}Semester 4 contains the remaining {remainingTaughtInS4} taught-module CP; complete them before the
          thesis presentation, reaching {taughtBeforeS4 + remainingTaughtInS4} CP.
        </div>
      )}

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

      <details style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
        <summary
          style={{
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          Bucket breakdown
        </summary>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {bucketBreakdown.map(({ key, bucket, courses: bucketCourses }) => (
            <details key={key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}
              >
                <span>{bucket?.label ?? key}</span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {bucketCourses.reduce((sum, course) => sum + course.cp, 0)} CP · {bucketCourses.length} course
                  {bucketCourses.length === 1 ? '' : 's'}
                </span>
              </summary>
              <div style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Contributes:</strong>{' '}
                {bucketCourses.length > 0 ? bucketCourses.map((course) => course.code).join(', ') : 'None planned'}
              </div>
              {bucketCourses.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: '16px', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.5 }}>
                  {bucketCourses.map((course) => (
                    <li key={course.id}>
                      {course.code} · {course.cp} CP{course.eligibleModules?.length ? ` · allocated to ${creditModule(course)}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </div>
      </details>

      <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {admissionTarget === 0 && stats.admission === 0 ? null : stats.admission === admissionTarget ? (
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
            {visibleHardConflicts.map((pair) => (
              <li key={`${pair.sem}-${pair.day}-${pair.courseA.id}-${pair.courseB.id}`}>
                <button
                  type="button"
                  className="conflict-row"
                  title={`Show conflict details for ${pair.courseA.id} and ${pair.courseB.id}`}
                  onClick={() =>
                    window.alert(
                      `Conflict: ${pair.courseA.id} vs ${pair.courseB.id}\n${pair.day} ${pair.timeA} vs ${pair.timeB}`,
                    )
                  }
                >
                  {`${pair.day} ${pair.timeA} vs ${pair.timeB} — ${pair.courseA.title} vs ${pair.courseB.title}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {softConflicts.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#d97706' }}>
          <strong>Other timetable overlaps</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
            {visibleSoftConflicts.map((pair) => (
              <li key={`${pair.sem}-${pair.day}-${pair.courseA.id}-${pair.courseB.id}`}>
                <button
                  type="button"
                  className="conflict-row"
                  title={`Show conflict details for ${pair.courseA.id} and ${pair.courseB.id}`}
                  onClick={() =>
                    window.alert(
                      `Conflict: ${pair.courseA.id} vs ${pair.courseB.id}\n${pair.day} ${pair.timeA} vs ${pair.timeB}`,
                    )
                  }
                >
                  {`${pair.day} ${pair.timeA} vs ${pair.timeB} — ${pair.courseA.title} vs ${pair.courseB.title}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasHiddenConflicts && (
        <button
          type="button"
          aria-expanded={showAllConflicts}
          onClick={() => setShowAllConflicts((visible) => !visible)}
          style={{
            alignSelf: 'flex-start',
            marginTop: '8px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {showAllConflicts ? 'Show fewer conflicts' : 'Show all conflicts'}
        </button>
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
                <span title={discrepancy.note}>
                  {course.title} ({course.id})
                </span>
                : catalog “{discrepancy.catalogModule}” vs VV “{discrepancy.vvModulesTab}”
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
