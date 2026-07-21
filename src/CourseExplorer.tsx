import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShieldAlert, X, ChevronRight, Info, Target, GraduationCap } from 'lucide-react';
import { COURSES } from './courses';
import { evaluatePlan, statusColor, type RuleKind } from './degreeRules';
import type { Course } from './types';

type BucketDef = {
  id: string;
  title: string;
  reqCp: number;
  kind: RuleKind;
  required: boolean;
  desc: string;
};

const BUCKETS: BucketDef[] = [
  {
    id: 'Admission',
    title: 'Conditional Admission',
    reqCp: 28,
    kind: 'exact',
    required: true,
    desc: 'Exactly 28 CP bachelor Auflagen (model: Analysis 12 + Algorithms 8 + SciComp 8).',
  },
  {
    id: 'Thesis',
    title: 'Master Thesis Block',
    reqCp: 36,
    kind: 'exact',
    required: true,
    desc: 'Exactly 36 CP: Preparation (6) + Master Thesis (30).',
  },
  {
    id: 'Machine Learning',
    title: 'Machine Learning',
    reqCp: 18,
    kind: 'min',
    required: false,
    desc: 'Minimum 18 CP in core ML/AI.',
  },
  {
    id: 'Systems',
    title: 'Systems Foundations',
    reqCp: 18,
    kind: 'min',
    required: false,
    desc: 'Minimum 18 CP in scalable systems & computing.',
  },
  {
    id: 'Math',
    title: 'Mathematical Foundations',
    reqCp: 18,
    kind: 'min',
    required: false,
    desc: 'Minimum 18 CP in advanced mathematics.',
  },
  {
    id: 'Electives',
    title: 'Electives & Applications',
    reqCp: 20,
    kind: 'exact',
    required: false,
    desc: 'Exactly 20 CP in application domains or Data Science projects.',
  },
];

function bucketStatus(value: number, target: number, kind: RuleKind) {
  if (value === 0) return 'empty' as const;
  if (kind === 'exact') {
    if (value < target) return 'short' as const;
    if (value > target) return 'overshoot' as const;
    return 'met' as const;
  }
  return value < target ? ('short' as const) : ('met' as const);
}

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

  const getModuleColor = (moduleName: string) => {
    if (moduleName.includes('Admission')) return '#d97706';
    if (moduleName.includes('Math')) return '#2563eb';
    if (moduleName.includes('Machine Learning')) return '#10b981';
    if (moduleName.includes('Systems')) return '#8b5cf6';
    if (moduleName.includes('Electives')) return '#ec4899';
    if (moduleName.includes('Thesis')) return '#f43f5e';
    return 'var(--text-secondary)';
  };

  const coursesByBucket = useMemo(() => {
    const grouped: Record<string, Course[]> = {};
    BUCKETS.forEach((b) => (grouped[b.id] = []));
    COURSES.forEach((c) => {
      const bucket = BUCKETS.find((b) => c.module.includes(b.id));
      if (bucket) grouped[bucket.id].push(c as Course);
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

  const shortlistedCp = useMemo(() => {
    const cp: Record<string, number> = {};
    BUCKETS.forEach((b) => (cp[b.id] = 0));
    shortlistedCourses.forEach((c) => {
      const bucket = BUCKETS.find((b) => c.module.includes(b.id));
      if (bucket) cp[bucket.id] += c.cp;
    });
    return cp;
  }, [shortlistedCourses]);

  const totalCp = evaluation.stats.grandTotal;
  const totalStatus = bucketStatus(totalCp, 148, 'exact');
  const foundationsStatus = bucketStatus(evaluation.stats.foundationsSum, 64, 'min');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
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
            <strong>148 CP</strong>. Currently wishlisted:{' '}
            <strong style={{ color: statusColor(totalStatus, 'var(--accent-primary)') }}>{totalCp} CP</strong>
            {' · '}Foundations sum:{' '}
            <strong style={{ color: statusColor(foundationsStatus, '#6366f1') }}>
              {evaluation.stats.foundationsSum}/64
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
            const currentCp = shortlistedCp[bucket.id];
            const status = bucketStatus(currentCp, bucket.reqCp, bucket.kind);
            const progressPercent = Math.min(100, (currentCp / bucket.reqCp) * 100);
            const color = getModuleColor(bucket.id);
            const barColor = statusColor(status, color);

            return (
              <div key={bucket.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {bucket.kind === 'exact' ? 'exact' : 'minimum'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{bucket.desc}</p>
                  </div>

                  <div style={{ width: '200px', textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: barColor }}>
                      {currentCp} / {bucket.reqCp} CP
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {coursesByBucket[bucket.id].map((course) => {
                    const isSelected = shortlist.includes(course.id);
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
                          transition: 'all 0.2s',
                          position: 'relative',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
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

                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {course.code}
                          </span>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {course.cp} CP
                          </span>
                          <span style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
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
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
              background: 'rgba(0,0,0,0.6)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
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
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              }}
            >
              <div
                style={{
                  padding: '24px 32px',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: getModuleColor(selectedCourse.module),
                      }}
                    >
                      {selectedCourse.module}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-primary)' }}>{selectedCourse.title}</h2>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedCourse(null)}
                  aria-label="Close"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="explorer-detail-grid">
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
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <strong style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Credits & Semester
                    </strong>
                    <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '500' }}>
                      {selectedCourse.cp} CP · {selectedCourse.when}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <strong style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Assessment
                    </strong>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.4 }}>
                      {selectedCourse.exam || 'N/A'}
                    </div>
                  </div>
                  {selectedCourse.prerequisites && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <strong style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  padding: '24px 32px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    toggleShortlist(selectedCourse.id);
                    setSelectedCourse(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: shortlist.includes(selectedCourse.id) ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-primary)',
                    color: shortlist.includes(selectedCourse.id) ? '#d97706' : '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: shortlist.includes(selectedCourse.id) ? 'none' : '0 4px 12px var(--accent-glow)',
                  }}
                >
                  <Star
                    size={20}
                    fill={shortlist.includes(selectedCourse.id) ? '#f59e0b' : 'none'}
                    color={shortlist.includes(selectedCourse.id) ? '#f59e0b' : 'currentColor'}
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
