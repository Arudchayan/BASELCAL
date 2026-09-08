import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, Star, ShieldAlert, X, ChevronRight, Info, Target, GraduationCap } from 'lucide-react';
import { COURSES } from './courses';
import {
  DEGREE_RULES,
  evaluatePlan,
  statusColor,
  statusFor,
  type DegreeStats,
} from './degreeRules';
import { getModuleDiscrepancy, isDisputedModule } from './coveragePolicy';
import { isStaleWatch } from './coveragePolicy';
import { getPlacementWarnings } from './offering';
import { eligibleModulesFor, type Course } from './types';

type BucketDef = {
  /** Exact catalog module string — must match Course.module */
  module: string;
  statsKey: keyof DegreeStats;
  title: string;
  required: boolean;
  desc: string;
  color: string;
};

function bucketsFor(admissionTarget: number): BucketDef[] {
  return [
  {
    module: DEGREE_RULES.admission.module,
    statsKey: 'admission',
    title: 'Conditional Admission',
    required: admissionTarget > 0,
    desc: admissionTarget > 0
      ? `Admission conditions (Auflagen) are student-specific. Current target: exactly ${admissionTarget} CP from your Zulassungsbescheid.`
      : 'Admission conditions (Auflagen) are student-specific. Set your letter total in the planner header; 0 means no extra CP.',
    color: '#d97706',
  },
  {
    module: DEGREE_RULES.thesis.module,
    statsKey: 'thesis',
    title: 'Master Thesis Block',
    required: true,
    desc: 'Exactly 36 CP: Preparation (6) + Master Thesis (30).',
    color: '#f43f5e',
  },
  {
    module: DEGREE_RULES.ml.module,
    statsKey: 'ml',
    title: 'Machine Learning Foundations',
    required: false,
    desc: 'Minimum 18 CP in core ML/AI.',
    color: '#10b981',
  },
  {
    module: DEGREE_RULES.systems.module,
    statsKey: 'systems',
    title: 'Systems Foundations',
    required: false,
    desc: 'Minimum 18 CP in scalable systems & computing.',
    color: '#8b5cf6',
  },
  {
    module: DEGREE_RULES.math.module,
    statsKey: 'math',
    title: 'Mathematical Foundations',
    required: false,
    desc: 'Minimum 18 CP in advanced mathematics.',
    color: '#2563eb',
  },
  {
    module: DEGREE_RULES.electives.module,
    statsKey: 'electives',
    title: 'Electives in Data Science',
    required: false,
    desc: 'Exactly 20 CP in application domains or Data Science projects.',
    color: '#ec4899',
  },
  ];
}

function moduleColor(moduleName: string): string {
  return bucketsFor(0).find((b) => b.module === moduleName)?.color ?? 'var(--text-secondary)';
}

export const CourseExplorer = ({
  shortlist,
  toggleShortlist,
  onClose,
  admissionTarget,
}: {
  shortlist: string[];
  toggleShortlist: (id: string) => void;
  onClose: () => void;
  admissionTarget: number;
}) => {
  const BUCKETS = bucketsFor(admissionTarget);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCourse) setSelectedCourse(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, selectedCourse]);

  const coursesByBucket = useMemo(() => {
    const grouped: Record<string, Course[]> = {};
    bucketsFor(0).forEach((b) => (grouped[b.module] = []));
    COURSES.forEach((rawCourse) => {
      const course = rawCourse as Course;
      eligibleModulesFor(course).forEach((module) => {
        if (grouped[module]) grouped[module].push(course);
      });
    });
    return grouped;
  }, []);

  const shortlistedCourses = useMemo(
    () =>
      shortlist
        .map((id) => COURSES.find((c) => c.id === id))
        .filter(Boolean) as Course[],
    [shortlist],
  );

  const evaluation = useMemo(
    () => evaluatePlan(shortlistedCourses, admissionTarget),
    [shortlistedCourses, admissionTarget],
  );

  const discrepancy = selectedCourse ? getModuleDiscrepancy(selectedCourse.id) : undefined;
  const stale = selectedCourse ? isStaleWatch(selectedCourse.id) : false;
  const placementWarnings = selectedCourse
    ? (['s1', 's2'] as const)
        .flatMap((semesterId) => getPlacementWarnings(selectedCourse, semesterId))
        .filter(
          (warning, index, warnings) =>
            warnings.findIndex(
              (candidate) => candidate.level === warning.level && candidate.message === warning.message,
            ) === index,
        )
    : [];

  const totalCp = evaluation.stats.grandTotal;
  const totalStatus = statusFor(totalCp, DEGREE_RULES.grandTotal.target, DEGREE_RULES.grandTotal.kind);
  const foundationsStatus = statusFor(
    evaluation.stats.foundationsSum,
    DEGREE_RULES.foundationsSum.target,
    DEGREE_RULES.foundationsSum.kind,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Degree requirements roadmap"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '18px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <Target size={24} color="var(--accent-primary)" />
            Degree Requirements Roadmap
          </h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            <strong>Wishlist only</strong> — starring here does not place courses on the board. Need exactly{' '}
            <strong>{evaluation.rules.grandTotal.target} CP</strong>. Currently wishlisted:{' '}
            <strong style={{ color: statusColor(totalStatus, 'var(--accent-primary)') }}>{totalCp} CP</strong>
            {' · '}Foundations sum:{' '}
            <strong style={{ color: statusColor(foundationsStatus, 'var(--accent-primary)') }}>
              {evaluation.stats.foundationsSum}/{DEGREE_RULES.foundationsSum.target}
            </strong>
            {totalStatus === 'overshoot' && (
              <span style={{ color: 'var(--bad)', marginLeft: 8 }}>(overshoot)</span>
            )}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="btn btn--primary"
        >
          Return to Planner
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {BUCKETS.map((bucket) => {
            const rule = DEGREE_RULES[bucket.statsKey];
            const currentCp = evaluation.stats[bucket.statsKey];
            const status = statusFor(currentCp, rule.target, rule.kind);
            const progressPercent = Math.min(100, (currentCp / rule.target) * 100);
            const color = bucket.color;
            const barColor = statusColor(status, color);

            return (
              <div key={bucket.module} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '12px',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--text-primary)' }}>{bucket.title}</h2>
                      {bucket.required && (
                        <span
                          className="pill pill--red pill--bold"
                          style={{
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldAlert size={12} /> MUST TAKE
                        </span>
                      )}
                      <span className="micro-label">
                        {rule.kind === 'exact' ? 'exact' : 'minimum'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>{bucket.desc}</p>
                  </div>

                  <div style={{ width: '200px', textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: barColor, fontFamily: 'var(--font-mono)' }}>
                      <span className="num">{currentCp}</span> / <span className="num">{rule.target}</span> CP
                      {status === 'overshoot' ? ' (over)' : status === 'met' ? ' ✓' : ''}
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        style={{ height: '100%', background: barColor, borderRadius: '2px' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {coursesByBucket[bucket.module].map((course) => {
                    const isSelected = shortlist.includes(course.id);
                    const disputed = isDisputedModule(course.id);
                    const stale = isStaleWatch(course.id);
                    const firstSession = course.schedule?.[0];
                    const exam = course.exam?.trim() || '';
                    return (
                      <motion.div
                        key={course.id}
                        whileHover={{ y: -1, boxShadow: '0 3px 12px -6px rgba(0,0,0,0.25)' }}
                        style={{
                          background: isSelected ? `${color}12` : 'var(--bg-secondary)',
                          border: `1px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          position: 'relative',
                          boxShadow: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: '15px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.3,
                              paddingRight: '30px',
                            }}
                          >
                            {course.title}
                            {disputed && (
                              <span
                                title="Module membership disputed vs VV — verify program PDF"
                                className="pill pill--amber pill--bold"
                                style={{ marginLeft: 8, verticalAlign: 'middle' }}
                              >
                                Disputed module
                              </span>
                            )}
                          </h4>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleShortlist(course.id);
                            }}
                            aria-label={isSelected ? 'Remove from wishlist' : 'Add to wishlist'}
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Star
                              size={20}
                              fill={isSelected ? 'var(--warn)' : 'none'}
                              color={isSelected ? 'var(--warn)' : 'var(--text-muted)'}
                            />
                          </motion.button>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="pill pill--code">{course.code}</span>
                          <span className="pill num" style={{ fontFamily: 'var(--font-mono)' }}>
                            {course.cp} CP
                          </span>
                          <span
                            className={`pill priority-${course.priority.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {course.priority}
                          </span>
                          <span className="pill">{course.when}</span>
                          {firstSession && (
                            <span className="pill pill--schedule" title="First weekly timetable slot">
                              {firstSession.day} · {firstSession.time}
                            </span>
                          )}
                          {stale && (
                            <span
                              className="pill pill--amber pill--bold"
                              title="VV schedule may be from an older offering — re-check Vorlesungsverzeichnis"
                            >
                              Verify VV
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: '12px',
                            borderTop: '1px dashed var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {exam ? `${exam.slice(0, 80)}${exam.length > 80 ? '...' : ''}` : 'Check details'}
                          </span>
                          <motion.button
                            whileHover={{ x: 3 }}
                            type="button"
                            onClick={() => setSelectedCourse(course)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent-primary)',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Read Details <ChevronRight size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(20,12,10,0.55)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
            }}
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              role="dialog"
              aria-label={selectedCourse.title}
              style={{
                position: 'relative',
                zIndex: 101,
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                background: 'var(--bg-primary)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              }}
            >
              <div
                style={{
                  padding: '18px 28px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      className="micro-label"
                      style={{
                        color: moduleColor(selectedCourse.module),
                      }}
                    >
                      {selectedCourse.module}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>{selectedCourse.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                    <span className="pill pill--lg pill--code">{selectedCourse.code}</span>
                    <span className="pill pill--lg num" style={{ fontFamily: 'var(--font-mono)' }}>{selectedCourse.cp} CP</span>
                    <span
                      className={`pill pill--lg priority-${selectedCourse.priority.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {selectedCourse.priority}
                    </span>
                    <span className="pill pill--lg">{selectedCourse.lang}</span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedCourse(null)}
                  aria-label="Close"
                  className="icon-btn"
                  style={{
                    borderRadius: '8px',
                    width: '34px',
                    height: '34px',
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="explorer-detail-grid">
                {(stale || discrepancy || placementWarnings.length > 0) && (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stale && (
                      <div
                        style={{
                          background: 'var(--warn-bg)',
                          borderLeft: '3px solid var(--warn)',
                          color: 'inherit',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warn)' }}>
                          <ShieldAlert size={16} /> Verify VV offering before enrolling
                        </strong>
                        <div style={{ marginTop: '4px' }}>
                          This course has older or irregular VV offering metadata. Confirm that it runs in your target
                          semester before enrolling.
                        </div>
                      </div>
                    )}
                    {discrepancy && (
                      <div
                        style={{
                          background: 'var(--warn-bg)',
                          borderLeft: '3px solid var(--warn)',
                          color: 'inherit',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                        }}
                        title={discrepancy.note}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warn)' }}>
                          <ShieldAlert size={16} /> Disputed module membership
                        </strong>
                        <div style={{ marginTop: '4px' }}>
                          Catalog: {discrepancy.catalogModule}. VV Modules tab: {discrepancy.vvModulesTab}. Resolve
                          against the program PDF before counting.
                        </div>
                      </div>
                    )}
                    {placementWarnings.length > 0 && (
                      <div
                        style={{
                          background: 'var(--warn-bg)',
                          borderLeft: '3px solid var(--warn)',
                          color: 'inherit',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warn)' }}>
                          <AlertCircle size={16} /> Placement warnings
                        </strong>
                        <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                          {placementWarnings.map((warning, index) => (
                            <li key={`${warning.level}-${index}`}>{warning.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  {selectedCourse.description && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Info size={16} color="var(--accent-primary)" /> Description
                      </h3>
                      <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
                        {selectedCourse.description}
                      </p>
                    </div>
                  )}
                  {selectedCourse.schedule && selectedCourse.schedule.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Calendar size={16} color="var(--accent-primary)" /> Weekly Schedule
                      </h3>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 0,
                          listStyle: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {selectedCourse.schedule.map((sess, i) => (
                          <li
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              background: 'var(--bg-secondary)',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div style={{ fontWeight: 'bold', width: '90px' }}>{sess.day}</div>
                            <div style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{sess.time}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{sess.room}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedCourse.syllabus && Array.isArray(selectedCourse.syllabus) && selectedCourse.syllabus.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          color: 'var(--text-primary)',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <GraduationCap size={16} color="var(--accent-primary)" /> Learning Objectives
                      </h3>
                      <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                        {selectedCourse.syllabus.map((s, i) => (
                          <li key={i} style={{ marginBottom: '6px' }}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'transparent', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <strong className="micro-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Lecturer
                    </strong>
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500' }}>
                      {selectedCourse.lecturer || 'Not specified'}
                    </div>
                  </div>
                  <div style={{ background: 'transparent', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <strong className="micro-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Credits & Semester
                    </strong>
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500' }}>
                      {selectedCourse.cp} CP · {selectedCourse.when}
                    </div>
                  </div>
                  <div style={{ background: 'transparent', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <strong className="micro-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Assessment
                    </strong>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.4 }}>
                      {selectedCourse.exam || 'N/A'}
                    </div>
                  </div>
                  {selectedCourse.prerequisites && (
                    <div style={{ background: 'transparent', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <strong className="micro-label" style={{ display: 'block', marginBottom: '4px' }}>
                        Prerequisites
                      </strong>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.4 }}>
                        {selectedCourse.prerequisites}
                      </div>
                    </div>
                  )}
                  {selectedCourse.url && (
                    <a href={selectedCourse.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: 14 }}>
                      Official course page →
                    </a>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: '18px 28px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    toggleShortlist(selectedCourse.id);
                    setSelectedCourse(null);
                  }}
                  className={
                    shortlist.includes(selectedCourse.id)
                      ? 'btn btn--ghost'
                      : 'btn btn--primary'
                  }
                  style={
                    shortlist.includes(selectedCourse.id)
                      ? { color: 'var(--warn)', borderColor: 'var(--warn)' }
                      : undefined
                  }
                >
                  <Star
                    size={16}
                    fill={shortlist.includes(selectedCourse.id) ? 'var(--warn)' : 'none'}
                    color={shortlist.includes(selectedCourse.id) ? 'var(--warn)' : 'currentColor'}
                  />
                  {shortlist.includes(selectedCourse.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
