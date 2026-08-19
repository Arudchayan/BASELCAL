import { BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import {
  assignColumns,
  collectDaySessions,
  findConflicts,
  isMandatoryAttendance,
} from './conflicts';
import { getModuleColor } from './uiHelpers';
import type { PlanState, SemesterId } from './types';
import { SEMESTERS } from './types';

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

  const formatTime = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;
  const getUKTime = (hour: number) => `${(hour - 1).toString().padStart(2, '0')}:00`;
  const getSLTime = (hour: number) => {
    let h = hour + 4;
    const m = 30;
    if (h >= 24) h -= 24;
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--accent-primary)" />
          Weekly Timetable Preview
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SEMESTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSem(s.id as SemesterId)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeSem === s.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: activeSem === s.id ? '#fff' : 'var(--text-primary)',
                fontWeight: activeSem === s.id ? 'bold' : 'normal',
                boxShadow: activeSem === s.id ? '0 4px 12px var(--accent-glow)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {s.title.split('·')[0].trim() || s.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        >
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: 14,
              color: '#ef4444',
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

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: 12,
              height: 12,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid var(--accent-primary)',
              borderLeft: '3px solid var(--accent-primary)',
            }}
          />
          Mandatory Attendance
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: 12,
              height: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed var(--border-subtle)',
              borderLeft: '3px solid var(--border-subtle)',
            }}
          />
          Flexible (Exam Only)
        </div>
      </div>

      <div className="timetable-grid" style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '12px' }} />
        {days.map((d) => (
          <div
            key={d}
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              fontSize: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            {d}
          </div>
        ))}

        <div style={{ background: 'var(--bg-secondary)', position: 'relative', height: `${(HOURS.length - 1) * HOUR_HEIGHT}px` }}>
          {HOURS.slice(0, -1).map((h, i) => (
            <div
              key={h}
              title={`UK: ${getUKTime(h)} | SL: ${getSLTime(h)}`}
              style={{
                position: 'absolute',
                top: i * HOUR_HEIGHT - 8,
                right: 8,
                fontSize: '11px',
                color: 'var(--text-muted)',
                textAlign: 'right',
                cursor: 'help',
                zIndex: 2,
              }}
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
                const baseBg = mandatory ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)';
                const leftBorderColor = isConflict
                  ? '#ef4444'
                  : mandatory
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)';

                // Clamp visual position into grid but still show off-hours with a hint
                const visualTop = Math.max(-4, Math.min(top, (HOURS.length - 2) * HOUR_HEIGHT));
                const visualHeight = Math.max(18, height - 2);

                return (
                  <div
                    key={`${sess.course.id}-${i}`}
                    title={`${sess.course.title}\n${sess.time}\n${sess.room}\n${mandatory ? 'MANDATORY' : 'FLEXIBLE'}`}
                    style={{
                      position: 'absolute',
                      top: visualTop + 'px',
                      left: leftOffset + '%',
                      width: width + '%',
                      height: visualHeight + 'px',
                      background: isConflict ? 'rgba(239, 68, 68, 0.15)' : baseBg,
                      borderLeft: `4px solid ${leftBorderColor}`,
                      borderTop: mandatory ? `1px solid ${leftBorderColor}` : '1px dashed var(--border-subtle)',
                      borderRight: mandatory ? `1px solid ${leftBorderColor}` : '1px dashed var(--border-subtle)',
                      borderBottom: mandatory ? `1px solid ${leftBorderColor}` : '1px dashed var(--border-subtle)',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      fontSize: '11px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: isConflict ? 10 + i : 5,
                      backdropFilter: 'blur(4px)',
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
                        }}
                      >
                        {sess.course.title}
                      </strong>
                      {mandatory && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            marginLeft: '4px',
                          }}
                        >
                          M
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{sess.time}</div>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '10px',
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
              fontSize: '16px',
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {unscheduledCourses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-primary)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${getModuleColor(c.module)}`,
                    fontSize: '12px',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    {c.title}
                  </strong>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {c.cp} CP · {c.module}
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
