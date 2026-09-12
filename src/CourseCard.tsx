import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { AlertCircle, Maximize2, Plus, StickyNote, X, Zap } from 'lucide-react';
import { getModuleDiscrepancy, isDisputedModule } from './coveragePolicy';
import { parseOffering, primaryMismatchMessage } from './offering';
import { isStaleWatch } from './coveragePolicy';
import { creditModule, eligibleModulesFor, type Course, type CourseModule, type SemesterId } from './types';

const getModuleColor = (moduleName: string): string => {
  if (moduleName.includes('Admission')) return 'var(--module-admission)';
  if (moduleName.includes('Math')) return 'var(--module-math)';
  if (moduleName.includes('Machine Learning')) return 'var(--module-ml)';
  if (moduleName.includes('Systems')) return 'var(--module-systems)';
  if (moduleName.includes('Electives')) return 'var(--module-electives)';
  if (moduleName.includes('Thesis')) return 'var(--module-thesis)';
  return 'var(--text-secondary)';
};

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
  quickAddHint?: string;
  onAllocationChange?: (module: CourseModule) => void;
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
  quickAddHint,
  onAllocationChange,
}: CourseCardProps) {
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
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
  const eligibleModules = eligibleModulesFor(course);
  const allocatedModule = creditModule(course);
  const scheduleLabel =
    firstSession && course.scheduleStatus !== 'contract' && course.scheduleStatus !== 'thesis'
      ? `${firstSession.day.slice(0, 3)} ${firstSession.time.replace(/\s*[-–—]\s*/g, '-')}${scheduleCount > 1 ? ` +${scheduleCount - 1}` : ''}`
      : null;

  useEffect(() => {
    setDraftNote(noteText || '');
    draftRef.current = noteText || '';
    if (noteText) setNoteOpen(true);
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
            marginBottom: '10px',
            padding: '12px 14px',
            position: 'relative',
            background: snapshot.isDragging ? 'var(--glass-dragging-bg)' : undefined,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            boxShadow: snapshot.isDragging ? '0 12px 32px -8px var(--glass-shadow)' : undefined,
          }}
        >
          {isPlanned && onRemove && (
            <button
              onClick={onRemove}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Remove ${course.title}`}
              className="btn--quiet card-remove"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
          {!isPlanned && onQuickAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={quickAddHint ?? `Add ${course.title} to plan`}
              title={quickAddHint ?? 'Add to first matching semester'}
              className="card-quick-add"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'var(--accent-primary)',
                border: 'none',
                color: 'var(--on-accent)',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
            </button>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 2,
              paddingRight: 30,
            }}
          >
            <span className="num" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>
              {course.code}
            </span>
            <span className="num" style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>
              {course.cp} CP
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingRight: 26 }}>
            <h4 style={{ margin: 0, fontSize: 13.5, lineHeight: 1.35, fontWeight: 600 }}>
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
                  alignItems: 'baseline',
                  gap: 5,
                }}
                title="Opens official course page (also copies course code)"
              >
                {course.title}
                <Zap size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }} />
              </a>
            </h4>
            <button
              onClick={onShowDetails}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Details for ${course.title}`}
              title="View Course Details"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {copyToast && (
            <div style={{ fontSize: 10.5, color: 'var(--ok)', marginTop: 4 }}>{copyToast}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
            <span className="module-dot" title={allocatedModule} style={{ background: getModuleColor(allocatedModule) }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{course.lang}</span>
            {eligibleModules.length > 1 && !isPlanned && (
              <span className="pill pill--blue" title={eligibleModules.join(' or ')}>Cross-listed · {eligibleModules.length} modules</span>
            )}
            {scheduleLabel && (
              <span title="First scheduled session" className="pill pill--schedule">
                {scheduleLabel}
              </span>
            )}
            <span className={`pill priority-${course.priority.toLowerCase().replace(/\s+/g, '-')}`}>
              {course.priority}
            </span>
            {course.type === 'Admission' && <span className="pill pill--amber">Admission Req</span>}
            {course.lang === 'German' && <span className="pill pill--red">DE</span>}
            {offering.season === 'irregular' && (
              <span className="pill pill--amber" title="Verify this course runs in your target year">
                Irregular
              </span>
            )}
            {offering.biennial && (
              <span className="pill pill--blue" title="Offered every second cycle — confirm availability">
                Biennial
              </span>
            )}
            {offering.season === 'contract' && <span className="pill pill--green">Contract</span>}
            {isStaleWatch(course.id) && (
              <span
                className="pill pill--red-soft"
                title={`Stale/irregular offering — VV semester not HS/FS 2026, verify ${course.when} (audit 2026-07-21)`}
              >
                Verify VV
              </span>
            )}
            {disputed && discrepancy && (
              <span title={discrepancy.note} className="pill pill--disputed">
                Disputed module
              </span>
            )}
          </div>

          {isPlanned && eligibleModules.length > 1 && onAllocationChange && (
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              Credit to
              <select
                aria-label={`Credit allocation for ${course.title}`}
                value={allocatedModule}
                onChange={(e) => onAllocationChange(e.target.value as CourseModule)}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '4px 6px' }}
              >
                {eligibleModules.map((module) => <option key={module} value={module}>{module}</option>)}
              </select>
            </label>
          )}

          {mismatchWarning && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--bad)',
                background: 'var(--bad-bg)',
                padding: '5px 9px',
                borderRadius: 6,
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={12} /> {mismatchWarning}
            </div>
          )}

          {course.note && !noteOpen && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginTop: 7,
                lineHeight: 1.45,
              }}
            >
              {course.note}
            </div>
          )}

          {onNoteChange && (
            <div style={{ marginTop: noteOpen ? 8 : 6 }}>
              {noteOpen ? (
                <textarea
                  value={draftNote}
                  onChange={(e) => scheduleFlush(e.target.value)}
                  onBlur={flushNote}
                  placeholder="Add personal notes here (e.g. prerequisite missing)..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 7,
                    padding: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    minHeight: 44,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setNoteOpen(true)}
                  aria-label={`Toggle note for ${course.title}`}
                  title="Add a personal note"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
                >
                  <StickyNote size={12} /> Note
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export const CourseCard = memo(CourseCardInner);
