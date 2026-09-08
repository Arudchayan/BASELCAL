import { BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import {
  assignColumns,
  collectDaySessions,
  findConflicts,
  isMandatoryAttendance,
} from './conflicts';
import type { PlanState, SemesterId } from './types';
import { creditModule, SEMESTERS } from './types';
import { CampusRoutePlanner } from './CampusRoutePlanner';

const getModuleColor = (moduleName: string): string => {
  if (moduleName.includes('Admission')) return 'var(--module-admission)';
  if (moduleName.includes('Math')) return 'var(--module-math)';
  if (moduleName.includes('Machine Learning')) return 'var(--module-ml)';
  if (moduleName.includes('Systems')) return 'var(--module-systems)';
  if (moduleName.includes('Electives')) return 'var(--module-electives)';
  if (moduleName.includes('Thesis')) return 'var(--module-thesis)';
  return 'var(--text-secondary)';
};

export function Timetable({
  plan,
  activeSem,
  setActiveSem,
}: {
  plan: PlanState;
  activeSem: SemesterId;
  setActiveSem: (sem: SemesterId) => void;
}) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const HOUR_HEIGHT = 60;

  const plannedCourses = plan[activeSem] || [];
  const conflicts = findConflicts(plannedCourses);
  const unscheduledCourses = plannedCourses.filter((course) => !course.schedule || course.schedule.length === 0);

  const totalCp = plannedCourses.reduce((sum, c) => sum + c.cp, 0);
  let rawHours = 0;
  for (const d of days) {
    const seen = new Set<string>();
    for (const sess of collectDaySessions(plannedCourses, d)) {
      const key = `${sess.course.id}|${sess.time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawHours += sess.end - sess.start;
    }
  }
  const contactHours = Math.round(rawHours * 2) / 2;

  const formatTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--accent-primary)" />
          Weekly Timetable Preview
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="micro-label">≈ {contactHours}h contact / week · {totalCp} CP</span>
          </div>
          <div className="segmented">
            {SEMESTERS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSem(s.id as SemesterId)}
                className={activeSem === s.id ? 'is-active' : undefined}
              >
                {s.title.split('·')[0].trim() || s.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {plannedCourses.length === 0 && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          No courses in this semester. Switch to Board to add some, or load the example outline.
        </p>
      )}

      {conflicts.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'var(--bad-bg)',
            borderLeft: '3px solid var(--bad)',
          }}
        >
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: 13,
              color: 'var(--bad)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={16} /> {conflicts.length} timetable conflict
            {conflicts.length === 1 ? '' : 's'} this semester
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {conflicts.map((c, i) => (
              <li key={i}>
                <strong>{c.day}</strong>: {c.courseA.title} ({c.timeA}) overlaps {c.courseB.title} ({c.timeB})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '3px solid var(--accent-primary)',
            }}
          />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Mandatory Attendance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border-subtle)',
              borderLeft: '3px solid var(--border-strong)',
            }}
          />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Flexible (Exam Only)</span>
        </div>
      </div>

      {activeSem !== 's1' && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(217, 119, 6, 0.1)', borderLeft: '3px solid var(--warn)', color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--warn)' }}>Provisional timetable.</strong> Spring 2027 and later offerings and
          meeting times have not yet been audited against the live VV semester. Treat this as a planning sketch and
          recheck it before enrollment.
        </div>
      )}

      <CampusRoutePlanner courses={plannedCourses} />

      <div className="timetable-grid" style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '12px' }} />
        {days.map((d) => (
          <div key={d} className="tt-day-head">
            {d}
          </div>
        ))}

        <div style={{ background: 'var(--bg-secondary)', position: 'relative', height: `${(HOURS.length - 1) * HOUR_HEIGHT}px` }}>
          {HOURS.slice(0, -1).map((h, i) => (
            <div
              key={h}
              className="tt-hour"
              style={{ top: i * HOUR_HEIGHT }}
            >
              {formatTime(h)}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const sessions = collectDaySessions(plannedCourses, d);
          const columns = assignColumns(sessions);

          return (
            <div
              key={d}
              style={{
                background: 'var(--bg-primary)',
                position: 'relative',
                height: `${(HOURS.length - 1) * HOUR_HEIGHT}px`,
                borderLeft: '1px solid var(--border-subtle)',
              }}
            >
              {HOURS.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: i * HOUR_HEIGHT,
                    left: 0,
                    width: '100%',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                    boxSizing: 'border-box',
                  }}
                />
              ))}

              {sessions.map((sess, i) => {
                const top = (sess.start - 8) * HOUR_HEIGHT;
                const height = (sess.end - sess.start) * HOUR_HEIGHT;
                const { colIndex, colCount } = columns[i];
                const widthPercent = 96 / colCount;
                const leftOffset = 2 + colIndex * widthPercent;
                const width = widthPercent - (colCount > 1 ? 2 : 0);
                const isConflict = colCount > 1;
                const mandatory = isMandatoryAttendance(sess.course);

                // Clamp visual position into grid but still show off-hours with a hint
                const visualTop = Math.max(-4, Math.min(top, (HOURS.length - 2) * HOUR_HEIGHT));
                const visualHeight = Math.max(18, height - 2);

                return (
                  <div
                    key={`${sess.course.id}-${i}`}
                    title={`${sess.course.title}\n${sess.time}\n${sess.room}\n${mandatory ? 'MANDATORY' : 'FLEXIBLE'}`}
                    className={'tt-session' + (isConflict ? ' tt-session--conflict' : '')}
                    style={{
                      top: visualTop + 'px',
                      left: leftOffset + '%',
                      width: width + '%',
                      height: visualHeight + 'px',
                      borderStyle: mandatory ? 'solid' : 'dashed',
                      boxSizing: 'border-box',
                      opacity: sess.start < 8 || sess.end > 19 ? 0.85 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong
                        style={{
                          display: 'block',
                          color: 'var(--text-primary)',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          fontSize: 11,
                        }}
                      >
                        {sess.course.title}
                      </strong>
                      {mandatory && (
                        <span
                          className="tt-badge"
                          style={{ background: 'var(--accent-primary)', color: 'var(--on-accent)', marginLeft: 4 }}
                        >
                          M
                        </span>
                      )}
                    </div>
                    <div className="mono" style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
                      {sess.time}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9.5,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sess.room}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {(() => {
        if (unscheduledCourses.length === 0) return null;
        return (
        <div
          style={{
            marginTop: '24px',
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: 16,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <BookOpen size={16} color="var(--accent-primary)" />
            Unscheduled courses ({unscheduledCourses.length}) — no fixed timetable; learning contracts &amp; thesis are
            remote-friendly
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {unscheduledCourses.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span className="module-dot" style={{ background: getModuleColor(creditModule(c)) }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {c.cp} CP · {creditModule(c)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
