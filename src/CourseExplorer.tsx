import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ShieldAlert, ChevronRight, Target } from 'lucide-react';
import { CourseDetailsModal } from './CourseDetailsModal';
import { COURSES } from './courses';
import {
  DEGREE_RULES,
  evaluatePlan,
  statusColor,
  type BucketEvaluation,
} from './degreeRules';
import { isDisputedModule } from './coveragePolicy';
import type { Course } from './types';

type BucketDef = {
  /** Exact catalog module string — must match Course.module */
  module: string;
  key: BucketEvaluation['key'];
  title: string;
  required: boolean;
  desc: string;
  color: string;
};

const BUCKETS: BucketDef[] = [
  {
    module: DEGREE_RULES.admission.module,
    key: 'admission',
    title: 'Conditional Admission',
    required: true,
    desc: 'Exactly 28 CP bachelor Auflagen (model: Analysis 12 + Algorithms 8 + SciComp 8).',
    color: '#d97706',
  },
  {
    module: DEGREE_RULES.thesis.module,
    key: 'thesis',
    title: 'Master Thesis Block',
    required: true,
    desc: 'Exactly 36 CP: Preparation (6) + Master Thesis (30).',
    color: '#f43f5e',
  },
  {
    module: DEGREE_RULES.ml.module,
    key: 'ml',
    title: 'Machine Learning Foundations',
    required: false,
    desc: 'Minimum 18 CP in core ML/AI.',
    color: '#10b981',
  },
  {
    module: DEGREE_RULES.systems.module,
    key: 'systems',
    title: 'Systems Foundations',
    required: false,
    desc: 'Minimum 18 CP in scalable systems & computing.',
    color: '#8b5cf6',
  },
  {
    module: DEGREE_RULES.math.module,
    key: 'math',
    title: 'Mathematical Foundations',
    required: false,
    desc: 'Minimum 18 CP in advanced mathematics.',
    color: '#2563eb',
  },
  {
    module: DEGREE_RULES.electives.module,
    key: 'electives',
    title: 'Electives in Data Science',
    required: false,
    desc: 'Exactly 20 CP in application domains or Data Science projects.',
    color: '#ec4899',
  },
];

export const CourseExplorer = ({
  shortlist,
  toggleShortlist,
  onClose,
}: {
  shortlist: string[];
  toggleShortlist: (id: string) => void;
  onClose: () => void;
}) => {
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
    BUCKETS.forEach((b) => (grouped[b.module] = []));
    COURSES.forEach((c) => {
      const bucket = BUCKETS.find((b) => c.module === b.module);
      if (bucket) grouped[bucket.module].push(c as Course);
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

  const evaluation = useMemo(() => evaluatePlan(shortlistedCourses), [shortlistedCourses]);

  const totalBucket = evaluation.buckets.find((bucket) => bucket.key === 'grandTotal');
  const foundationsBucket = evaluation.buckets.find((bucket) => bucket.key === 'foundationsSum');
  const totalCp = totalBucket?.value ?? 0;
  const totalStatus = totalBucket?.status ?? 'empty';
  const foundationsStatus = foundationsBucket?.status ?? 'empty';

  return (
    <div
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
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--border-strong)',
          background: 'var(--bg-secondary)',
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
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <Target size={32} color="var(--accent-primary)" />
            Degree Requirements Roadmap
          </h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '15px' }}>
            <strong>Wishlist only</strong> — starring here does not place courses on the board. Need exactly{' '}
            <strong>{DEGREE_RULES.grandTotal.target} CP</strong>. Currently wishlisted:{' '}
            <strong style={{ color: statusColor(totalStatus, 'var(--accent-primary)') }}>{totalCp} CP</strong>
            {' · '}Foundations sum:{' '}
            <strong style={{ color: statusColor(foundationsStatus, '#6366f1') }}>
              {evaluation.stats.foundationsSum}/{DEGREE_RULES.foundationsSum.target}
            </strong>
            {totalStatus === 'overshoot' && (
              <span style={{ color: '#ef4444', marginLeft: 8 }}>(overshoot)</span>
            )}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent-primary)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}
        >
          Return to Planner
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {BUCKETS.map((bucket) => {
            const evaluationBucket = evaluation.buckets.find((candidate) => candidate.key === bucket.key);
            if (!evaluationBucket) return null;

            const { value: currentCp, target, kind, status } = evaluationBucket;
            const progressPercent = Math.min(100, (currentCp / target) * 100);
            const color = bucket.color;
            const barColor = statusColor(status, color);

            return (
              <div key={bucket.module} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    borderBottom: `2px solid ${color}40`,
                    paddingBottom: '12px',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>{bucket.title}</h2>
                      {bucket.required && (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 'bold',
                          }}
                        >
                          <ShieldAlert size={12} /> MUST TAKE
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {kind === 'exact' ? 'exact' : 'minimum'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{bucket.desc}</p>
                  </div>

                  <div style={{ width: '200px', textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: barColor }}>
                      {currentCp} / {target} CP
                      {status === 'overshoot' ? ' (over)' : status === 'met' ? ' ✓' : ''}
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        style={{ height: '100%', background: barColor, borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="explorer-card-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                    gap: '16px',
                  }}
                >
                  {coursesByBucket[bucket.module].map((course) => {
                    const isSelected = shortlist.includes(course.id);
                    const disputed = isDisputedModule(course.id);
                    return (
                      <motion.div
                        key={course.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        style={{
                          background: isSelected ? `${color}15` : 'var(--bg-secondary)',
                          border: `1px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          minWidth: 0,
                          transition: 'all 0.2s',
                          position: 'relative',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0 }}>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: '15px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.3,
                              paddingRight: '30px',
                              minWidth: 0,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {course.title}
                            {disputed && (
                              <span
                                title="Module membership disputed vs VV — verify program PDF"
                                style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: '#d97706',
                                  background: 'rgba(217, 119, 6, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  verticalAlign: 'middle',
                                }}
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
                              fill={isSelected ? '#f59e0b' : 'none'}
                              color={isSelected ? '#f59e0b' : 'var(--text-muted)'}
                            />
                          </motion.button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap', minWidth: 0 }}>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                            {course.code}
                          </span>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                            {course.cp} CP
                          </span>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', minWidth: 0, overflowWrap: 'anywhere' }}>
                            {course.when}
                          </span>
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
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: 0, overflowWrap: 'anywhere' }}>
                            {course.exam ? String(course.exam).split('(')[0].substring(0, 20) + '...' : 'Check details'}
                          </span>
                          <motion.button
                            whileHover={{ x: 5 }}
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

      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          isWishlisted={shortlist.includes(selectedCourse.id)}
          onToggleWishlist={() => {
            toggleShortlist(selectedCourse.id);
            setSelectedCourse(null);
          }}
        />
      )}
    </div>
  );
};
