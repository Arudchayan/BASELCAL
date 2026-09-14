import { useEffect, useRef } from 'react';
import { courseById } from './planStorage';
import { courseFullLabel } from './courseLabel';
import type { Course } from './types';

export interface ImportReportData {
  kept: { semTitle: string; courses: Course[] }[];
  droppedIds: string[];
  duplicateIds: string[];
  summary: string;
  status: string;
  caveats: string[];
}

interface ImportReportModalProps {
  report: ImportReportData;
  onClose: () => void;
}

/**
 * Itemised result of a plan-file import: exactly what was kept per semester,
 * which references were dropped as unknown, and which placements were skipped
 * as duplicates — replacing the old single-alert summary wall.
 */
export function ImportReportModal({ report, onClose }: ImportReportModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const keptCount = report.kept.reduce((n, section) => n + section.courses.length, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-report-title"
        className="glass-panel share-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id="import-report-title" style={{ margin: 0, fontSize: 18 }}>
            Plan imported
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="micro" style={{ margin: 0 }}>
          <strong>{report.summary}</strong> {report.status}
        </p>
        {report.caveats.length > 0 && (
          <p className="micro" style={{ margin: 0 }}>
            Check: {report.caveats.join('; ')}.
          </p>
        )}

        <div className="share-preview">
          <div className="micro" style={{ fontWeight: 700, marginBottom: 4 }}>
            Kept — {keptCount} course{keptCount === 1 ? '' : 's'}
          </div>
          {report.kept.length === 0 ? (
            <p className="micro" style={{ margin: '0 0 10px' }}>
              Nothing from the file matched the catalog.
            </p>
          ) : (
            report.kept.map((section) => (
              <div key={section.semTitle} style={{ marginBottom: 10 }}>
                <div className="micro" style={{ fontWeight: 700 }}>
                  {section.semTitle} — {section.courses.length} course{section.courses.length === 1 ? '' : 's'}
                </div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {section.courses.map((course) => (
                    <li key={course.id}>{courseFullLabel(course)}</li>
                  ))}
                </ul>
              </div>
            ))
          )}

          <div className="micro" style={{ fontWeight: 700, marginBottom: 4 }}>
            Dropped unknown references — {report.droppedIds.length}
          </div>
          {report.droppedIds.length === 0 ? (
            <p className="micro" style={{ margin: '0 0 10px' }}>
              None — every reference matched the catalog.
            </p>
          ) : (
            <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13 }}>
              {report.droppedIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          )}

          <div className="micro" style={{ fontWeight: 700, marginBottom: 4 }}>
            Skipped duplicate placements — {report.duplicateIds.length}
          </div>
          {report.duplicateIds.length === 0 ? (
            <p className="micro" style={{ margin: 0 }}>
              None.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {report.duplicateIds.map((id) => (
                <li key={id}>{courseById(id) ? courseFullLabel(courseById(id)!) : id}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
