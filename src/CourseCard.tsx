import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { AlertCircle, Maximize2, Plus, X, Zap } from 'lucide-react';
import { getModuleDiscrepancy, isDisputedModule } from './coveragePolicy';
import { parseOffering, primaryMismatchMessage } from './offering';
import { isStaleWatch } from './dataFreshness';
import { getModuleColor, getPriorityBg, getPriorityColor } from './uiHelpers';
import type { Course, SemesterId } from './types';

type CourseCardProps = {
  course: Course;
  index: number;
  isPlanned: boolean;
  currentSemId?: SemesterId;
  onRemove?: () => void;
  noteText?: string;
  onNoteChange?: (text: string) => void;
  onShowDetails: () => void;
  onQuickAdd?: () => void;
};

function CourseCardInner({
  course,
  index,
  isPlanned,
  currentSemId,
  onRemove,
  noteText,
  onNoteChange,
  onShowDetails,
  onQuickAdd,
}: CourseCardProps) {
  const [copyToast, setCopyToast] = useState<string | null>(null);
  // Keep note draft local so typing does not re-render the full DnD board every keystroke
  const [draftNote, setDraftNote] = useState(noteText || '');
  const draftRef = useRef(draftNote);
  const flushTimer = useRef<number | null>(null);
  const mismatchWarning =
    isPlanned && currentSemId ? primaryMismatchMessage(course, currentSemId) : null;
  const offering = parseOffering(course.when);
  const disputed = isDisputedModule(course.id);
  const discrepancy = disputed ? getModuleDiscrepancy(course.id) : undefined;
  const firstSession = course.schedule?.[0];
  const scheduleCount = course.schedule?.length ?? 0;
  const scheduleLabel =
    firstSession && course.scheduleStatus !== 'contract' && course.scheduleStatus !== 'thesis'
      ? `📅 ${firstSession.day.slice(0, 3)} ${firstSession.time.replace(/\s*[-–—]\s*/g, '-')}${scheduleCount > 1 ? ` +${scheduleCount - 1} more` : ''}`
      : null;

  useEffect(() => {
    setDraftNote(noteText || '');
    draftRef.current = noteText || '';
  }, [noteText, course.id]);

  const flushNote = useCallback(() => {
    if (!onNoteChange) return;
    if (flushTimer.current !== null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const next = draftRef.current;
    if (next !== (noteText || '')) onNoteChange(next);
  }, [onNoteChange, noteText]);

  const scheduleFlush = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraftNote(value);
      if (!onNoteChange) return;
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = null;
        if (draftRef.current !== (noteText || '')) onNoteChange(draftRef.current);
      }, 400);
    },
    [onNoteChange, noteText],
  );

  useEffect(() => {
    return () => {
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    };
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(course.code);
      setCopyToast('Code copied');
      setTimeout(() => setCopyToast(null), 1500);
    } catch {
      setCopyToast('Copy failed');
      setTimeout(() => setCopyToast(null), 1500);
    }
  };

  return (
    <Draggable draggableId={course.id + (isPlanned ? '_planned' : '')} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="course-card"
          style={{
            ...provided.draggableProps.style,
            marginBottom: '12px',
            padding: '16px',
            position: 'relative',
            borderLeft: mismatchWarning
              ? '4px solid #ef4444'
              : `4px solid ${getModuleColor(course.module)}`,
            background: snapshot.isDragging ? 'var(--glass-dragging-bg)' : 'var(--bg-secondary)',
            transition: snapshot.isDragging ? 'none' : 'background 0.2s ease, box-shadow 0.2s ease',
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            boxShadow: snapshot.isDragging ? '0 8px 32px var(--glass-shadow)' : 'none',
          }}
        >
          {isPlanned && onRemove && (
            <button
              onClick={onRemove}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Remove ${course.title}`}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
          {!isPlanned && onQuickAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Add ${course.title} to plan`}
              title="Add to first matching semester"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Plus size={14} />
            </button>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
              paddingRight: '28px',
            }}
          >
            <h4 style={{ margin: '0', fontSize: '15px' }}>
              <a
                href={course.url || 'https://vorlesungsverzeichnis.unibas.ch'}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  void copyCode();
                }}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Opens official course page (also copies course code)"
              >
                {course.title}
                <Zap size={12} style={{ color: 'var(--text-muted)' }} />
              </a>
            </h4>
            <button
              onClick={onShowDetails}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Details for ${course.title}`}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="View Course Details"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {copyToast && (
            <div
              style={{
                fontSize: 11,
                color: '#10b981',
                marginBottom: 6,
              }}
            >
              {copyToast}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--border-subtle)',
              }}
            >
              {course.code}
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
            {scheduleLabel && (
              <span
                title="First scheduled session"
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  maxWidth: '140px',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {scheduleLabel}
              </span>
            )}
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
            {course.type === 'Admission' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                }}
              >
                Admission Req
              </span>
            )}
            {course.lang === 'German' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                }}
              >
                DE
              </span>
            )}
            {offering.season === 'irregular' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                }}
                title="Verify this course runs in your target year"
              >
                Irregular
              </span>
            )}
            {offering.biennial && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                }}
                title="Offered every second cycle — confirm availability"
              >
                Biennial
              </span>
            )}
            {offering.season === 'contract' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                }}
              >
                Contract
              </span>
            )}
            {isStaleWatch(course.id) && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#f87171',
                }}
                title={`Stale/irregular offering — VV semester not HS/FS 2026, verify ${course.when} (audit 2026-07-21)`}
              >
                Verify VV
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {course.module} · {course.lang}
            </span>
            {disputed && discrepancy && (
              <span
                title={discrepancy.note}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontWeight: 700,
                }}
              >
                Disputed module
              </span>
            )}
          </div>

          {mismatchWarning && (
            <div
              style={{
                fontSize: '11px',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '6px 10px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={12} /> {mismatchWarning}
            </div>
          )}

          {course.note && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginBottom: '8px',
              }}
            >
              {course.note}
            </div>
          )}

          {onNoteChange && (
            <textarea
              value={draftNote}
              onChange={(e) => scheduleFlush(e.target.value)}
              onBlur={flushNote}
              placeholder="Add personal notes here (e.g. prerequisite missing)..."
              style={{
                width: '100%',
                background: 'rgba(128,128,128,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                minHeight: '44px',
                marginTop: '4px',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}

export const CourseCard = memo(CourseCardInner);
