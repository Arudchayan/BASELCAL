import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, BookOpen, Calendar, Maximize2, X, Zap } from 'lucide-react';
import { getModuleDiscrepancy } from './coveragePolicy';
import { isStaleWatch } from './dataFreshness';
import { isMandatoryAttendance } from './conflicts';
import { parseOffering } from './offering';
import { getPriorityBg, getPriorityColor } from './uiHelpers';
import type { Course } from './types';

export function CourseDetailsModal({ course, onClose }: { course: Course; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!course) return null;

  const discrepancy = getModuleDiscrepancy(course.id);
  const offering = parseOffering(course.when);
  const missingField = 'Not specified — verify VV';
  const noFixedSchedule = course.scheduleStatus === 'contract' || course.scheduleStatus === 'thesis';
  const mandatoryAttendance = isMandatoryAttendance(course);
  const offeringLabel = course.when
    ? `Offering: ${course.when} — ${offering.season}${offering.biennial ? ', biennial' : ''}`
    : `Offering: ${missingField}`;

  return (
    <AnimatePresence>
      <motion.div
        key="course-details-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={course.title}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1,
          }}
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass-panel"
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'rgba(128,128,128,0.03)',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-primary)' }}>
                {course.title}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--border-subtle)',
                  }}
                >
                  {course.code}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{course.module}</span>
                {discrepancy && (
                  <span
                    title={discrepancy.note}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(217, 119, 6, 0.15)',
                      color: '#d97706',
                      fontWeight: 700,
                    }}
                  >
                    Disputed module
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getPriorityBg(course.priority),
                    color: getPriorityColor(course.priority),
                  }}
                >
                  {course.priority}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--border-subtle)',
                  }}
                >
                  {course.type}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--border-subtle)',
                  }}
                >
                  {course.lang}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--border-subtle)',
                  }}
                >
                  {course.cp} CP
                </span>
              </div>
              {discrepancy && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: '#d97706', lineHeight: 1.45, maxWidth: 480 }}>
                  Catalog: {discrepancy.catalogModule}. VV Modules tab: {discrepancy.vvModulesTab}. Resolve against the
                  program PDF before counting.
                </p>
              )}
              {isStaleWatch(course.id) && (
                <div
                  role="note"
                  style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(217, 119, 6, 0.12)',
                    border: '1px solid rgba(217, 119, 6, 0.35)',
                    color: '#d97706',
                    fontSize: '12px',
                    lineHeight: 1.45,
                  }}
                >
                  Stale/irregular offering — VV semester not HS/FS 2026 (when: {course.when || missingField}) — verify
                  current VV before enrolling.
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close course details"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <Zap size={16} color="var(--accent-primary)" /> Course description
                </strong>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {course.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{missingField}</span>}
                </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                background: 'rgba(128,128,128,0.03)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                  <strong
                    style={{
                      color: 'var(--text-primary)',
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Lecturer
                  </strong>
                  <div
                    style={{
                      fontSize: '14px',
                      color: course.lecturer ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontStyle: course.lecturer ? 'normal' : 'italic',
                    }}
                  >
                    {course.lecturer || missingField}
                  </div>
              </div>
              <div>
                  <strong
                    style={{
                      color: 'var(--text-primary)',
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Exam Type
                  </strong>
                  <div
                    style={{
                      fontSize: '14px',
                      color: course.exam ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontStyle: course.exam ? 'normal' : 'italic',
                    }}
                  >
                    {course.exam || missingField}
                  </div>
              </div>
              <div>
                  <strong
                    style={{
                      color: 'var(--text-primary)',
                      display: 'block',
                      marginBottom: '4px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Offering
                  </strong>
                  <div
                    style={{
                      fontSize: '14px',
                      color: course.when ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontStyle: course.when ? 'normal' : 'italic',
                    }}
                  >
                    {course.when || missingField}
                  </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(128,128,128,0.03)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <strong
                style={{
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                <AlertCircle size={16} color="var(--accent-primary)" /> Placement warnings
              </strong>
              <div style={{ fontSize: '14px', color: course.when ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                {offeringLabel}
              </div>
              {noFixedSchedule && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No fixed schedule (remote-friendly)
                </div>
              )}
            </div>

            <div>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                <Calendar size={16} color="var(--accent-primary)" /> Attendance sensitivity
              </strong>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  background: mandatoryAttendance ? 'rgba(99, 102, 241, 0.15)' : 'var(--border-subtle)',
                  color: mandatoryAttendance ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {mandatoryAttendance ? 'Mandatory attendance (hard clash if overlapping)' : 'Flexible / exam-only'}
              </span>
            </div>

            <div>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <Calendar size={16} color="var(--accent-primary)" /> Weekly Schedule
                </strong>
                {course.schedule && course.schedule.length > 0 ? (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '0',
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {course.schedule.map((sess, i) => (
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
                        <div style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{sess.time}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{sess.room}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {noFixedSchedule ? 'No fixed schedule (remote-friendly)' : missingField}
                  </div>
                )}
            </div>

            <div>
                <strong
                  style={{
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <BookOpen size={16} color="var(--accent-primary)" /> Syllabus Highlights
                </strong>
                {course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0 ? (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '24px',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    {course.syllabus.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{missingField}</div>
                )}
            </div>

            <div
              style={{
                background: course.prerequisites ? 'rgba(239, 68, 68, 0.05)' : 'rgba(128,128,128,0.03)',
                border: course.prerequisites ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-subtle)',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <strong
                style={{
                  color: course.prerequisites ? '#ef4444' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                }}
              >
                <AlertCircle size={16} /> Prerequisites
              </strong>
              <div
                style={{
                  fontSize: '14px',
                  color: course.prerequisites ? 'var(--text-secondary)' : 'var(--text-muted)',
                  lineHeight: 1.6,
                  fontStyle: course.prerequisites ? 'normal' : 'italic',
                }}
              >
                {course.prerequisites || missingField}
              </div>
            </div>

            {course.url ? (
              <a
                href={course.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                Open official course page <Maximize2 size={16} />
              </a>
            ) : (
              <div style={{ marginTop: 'auto', fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Official course page: {missingField}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
