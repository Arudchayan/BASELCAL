import { useEffect, useRef, useState } from 'react';
import { courseFullLabel } from './courseLabel';
import {
  applyResolvedSchedules,
  mapEventIdsToCourses,
  parseUnicalUrl,
  resolveUnicalEvents,
} from './unical';
import type { Course } from './types';

export type UnicalImportResult = {
  courses: Course[];
  unknownIds: string[];
  ambiguousIds: string[];
  datesEnriched: boolean;
  warning?: string;
};

interface UnicalImportModalProps {
  onClose: () => void;
  onApply: (result: UnicalImportResult) => void;
}

/**
 * Guide + paste dialog for UniCal calendar links. Matched courses replace Sem 1
 * after confirm in the parent; date ranges are enriched via /api/unical-resolve
 * when available.
 */
export function UnicalImportModal({ onClose, onApply }: UnicalImportModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<UnicalImportResult | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const runParse = async () => {
    setError(null);
    setPreview(null);
    const parsed = parseUnicalUrl(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    try {
      const mapped = mapEventIdsToCourses(parsed.eventIds);
      if (mapped.matched.length === 0 && mapped.unknownIds.length === 0 && mapped.ambiguous.length === 0) {
        setError('No event ids could be matched.');
        return;
      }
      const resolve = await resolveUnicalEvents(parsed.eventIds);
      const courses = applyResolvedSchedules(mapped.matched, resolve.events);
      setPreview({
        courses,
        unknownIds: mapped.unknownIds,
        ambiguousIds: mapped.ambiguous.map((a) => a.vvId),
        datesEnriched: resolve.datesEnriched,
        warning: resolve.error,
      });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!preview || preview.courses.length === 0) return;
    onApply(preview);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unical-import-title"
        className="glass-panel share-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id="unical-import-title" style={{ margin: 0, fontSize: 18 }}>
            Import UniCal link
          </h2>
          <button ref={closeRef} type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="share-preview">
          <div className="micro" style={{ fontWeight: 700, marginBottom: 6 }}>
            How to get your link
          </div>
          <ol style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            <li>
              Open the{' '}
              <a href="https://vorlesungsverzeichnis.unibas.ch" target="_blank" rel="noreferrer">
                Vorlesungsverzeichnis
              </a>{' '}
              and add your courses (or open them from your enrolment).
            </li>
            <li>
              On a course page, use the UniCal / calendar action so events land in{' '}
              <a href="https://unical.unibas.ch" target="_blank" rel="noreferrer">
                UniCal
              </a>
              .
            </li>
            <li>
              In UniCal open <strong>Calendar</strong>, <strong>Timetable</strong>, or{' '}
              <strong>Downloads</strong> — the address bar should contain <span className="mono">?e=…</span> with
              your event ids.
            </li>
            <li>Copy that full URL and paste it below. We match ids to the BaselCal catalog and fill Sem 1.</li>
          </ol>
        </div>

        <label className="micro" htmlFor="unical-url-input" style={{ fontWeight: 700 }}>
          UniCal URL
        </label>
        <textarea
          id="unical-url-input"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="https://unical.unibas.ch/calendar?e=00302796,00302775,…"
          style={{
            width: '100%',
            resize: 'vertical',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />

        {error && (
          <p className="micro" style={{ color: 'var(--bad)', margin: 0 }} role="alert">
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary" onClick={() => void runParse()} disabled={busy || !value.trim()}>
            {busy ? 'Matching…' : 'Preview match'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={apply}
            disabled={!preview || preview.courses.length === 0}
          >
            Replace Sem 1
          </button>
        </div>

        {preview && (
          <div className="share-preview" style={{ marginTop: 8 }}>
            <p className="micro" style={{ margin: '0 0 8px' }}>
              <strong>
                {preview.courses.length} course{preview.courses.length === 1 ? '' : 's'} matched
              </strong>
              {preview.datesEnriched
                ? ' · date ranges enriched from UniCal'
                : ' · using catalog times (live date enrich unavailable)'}
              {preview.warning ? ` · ${preview.warning}` : ''}
            </p>
            {preview.courses.length > 0 ? (
              <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13 }}>
                {preview.courses.map((c) => (
                  <li key={c.id}>{courseFullLabel(c)}</li>
                ))}
              </ul>
            ) : (
              <p className="micro">No catalog matches — nothing will be applied.</p>
            )}
            {preview.unknownIds.length > 0 && (
              <>
                <div className="micro" style={{ fontWeight: 700 }}>
                  Unknown VV ids — {preview.unknownIds.length}
                </div>
                <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13 }}>
                  {preview.unknownIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </>
            )}
            {preview.ambiguousIds.length > 0 && (
              <>
                <div className="micro" style={{ fontWeight: 700 }}>
                  Ambiguous VV ids (skipped) — {preview.ambiguousIds.length}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {preview.ambiguousIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
