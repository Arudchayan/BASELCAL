import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildShareUrl, isShareUrlTooLong, MAX_SHARE_URL_LENGTH } from './share';
import { courseFullLabel } from './courseLabel';
import { SEMESTERS, type PlanState } from './types';

interface ShareModalProps {
  plan: PlanState;
  onClose: () => void;
  onNotify: (message: string) => void;
  /** Fallback when the link would exceed MAX_SHARE_URL_LENGTH — downloads the full JSON instead. */
  onExportJson: () => void;
}

/**
 * Share dialog: previews exactly what travels inside the link (course placements
 * + credit allocations, refs-only) and is honest about what stays behind
 * (notes, wishlist, admission target — use the JSON export for those).
 */
export function ShareModal({ plan, onClose, onNotify, onExportJson }: ShareModalProps) {
  const url = useMemo(() => buildShareUrl(plan), [plan]);
  const tooLong = isShareUrlTooLong(url);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onNotify('Share link copied — anyone opening it sees this exact plan');
    } catch {
      window.prompt('Copy this share link:', url);
    }
  };

  const sections = SEMESTERS.map((sem) => {
    const courses = plan[sem.id] ?? [];
    const cp = courses.reduce((n, c) => n + (c.cp ?? 0), 0);
    return { sem, courses, cp };
  }).filter((section) => section.courses.length > 0);
  const totalCourses = sections.reduce((n, section) => n + section.courses.length, 0);
  const totalCp = sections.reduce((n, section) => n + section.cp, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="glass-panel share-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id="share-modal-title" style={{ margin: 0, fontSize: 18 }}>
            Share plan
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="micro" style={{ margin: 0 }}>
          This link carries <strong>{totalCourses} courses ({totalCp} CP)</strong> with their semester
          placements and credit allocations. Personal notes, wishlist, and admission target stay in
          this browser — use <strong>Export plan JSON</strong> for a full backup.
        </p>

        <div className="share-cols">
          <div className="share-preview">
            {sections.map(({ sem, courses, cp }) => (
              <div key={sem.id} style={{ marginBottom: 10 }}>
                <div className="micro" style={{ fontWeight: 700 }}>
                  {sem.title} — {courses.length} course{courses.length === 1 ? '' : 's'}, {cp} CP
                </div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                  {courses.map((course) => (
                    <li key={course.id}>
                      {courseFullLabel(course)}
                      {course.allocatedModule && course.allocatedModule !== course.module && (
                        <span className="micro"> → {course.allocatedModule}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="share-side">
            {tooLong ? (
              <>
                <p className="micro" style={{ margin: 0 }}>
                  This plan is too long for a share link ({url.length.toLocaleString()} characters —
                  links over {MAX_SHARE_URL_LENGTH.toLocaleString()} get truncated by some browsers
                  and chat apps, and the QR code would be unscannable). Send the full JSON file
                  instead — it also keeps notes, wishlist and admission target.
                </p>
                <button type="button" className="btn" onClick={onExportJson}>
                  Download plan JSON
                </button>
              </>
            ) : (
              <>
                <div style={{ background: '#fff', padding: 10, borderRadius: 8 }}>
                  <QRCodeSVG value={url} size={150} bgColor="#ffffff" fgColor="#000000" aria-label="QR code for the share link" />
                </div>
                <button type="button" className="btn" onClick={() => void copyLink()}>
                  {copied ? 'Copied ✓' : 'Copy link'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
