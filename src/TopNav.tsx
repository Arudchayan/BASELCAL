import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  Download,
  LayoutGrid,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Printer,
  Sun,
  Undo2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import type { RefObject } from 'react';
import type { DegreeManifest, ProgrammeId } from './degrees/types';

export type ViewMode = 'board' | 'timetable';

/**
 * Top navigation bar — pure presentational leaf extracted from App (plan step 46).
 * All state lives in App; every interaction arrives as a prop callback.
 * DOM, classes, labels and titles are byte-identical to the pre-extraction header.
 */
export function TopNav({
  manifest,
  programmes,
  programmeId,
  enabledProgrammeIds,
  onProgrammeChange,
  viewMode,
  onViewModeChange,
  onOpenExplorer,
  onLoadPreset,
  ownerSession,
  onLogoutOwner,
  onShowLogin,
  undoCount,
  onUndo,
  onExport,
  fileInputRef,
  onImportFile,
  onImportUnical,
  onShare,
  onIcs,
  theme,
  onToggleTheme,
}: {
  manifest: Pick<DegreeManifest, 'shortName' | 'brandSubtitle'>;
  programmes: DegreeManifest[];
  programmeId: ProgrammeId;
  enabledProgrammeIds: ReadonlySet<ProgrammeId>;
  onProgrammeChange: (id: ProgrammeId) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenExplorer: () => void;
  onLoadPreset: () => void;
  ownerSession: boolean;
  onLogoutOwner: () => void;
  onShowLogin: () => void;
  undoCount: number;
  onUndo: () => void;
  onExport: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImportFile: (file: File) => void;
  onImportUnical: () => void;
  onShare: () => void;
  onIcs: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const dismissThen = (fn: () => void) => () => {
    setMoreOpen(false);
    fn();
  };

  // Close the overflow sheet on Escape and return focus to the toggle.
  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  // If the viewport grows back to desktop, dismiss the mobile sheet.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 720) setMoreOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Move focus into the sheet when it opens so keyboard users land on actions.
  useEffect(() => {
    if (moreOpen) panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [moreOpen]);

  return (
    <>
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel topnav"
    >
      <div className="brand">
        <div className="brand-mark">{manifest.shortName}</div>
        <div style={{ minWidth: 0 }}>
          <h1>UniBasel {manifest.shortName} Planner</h1>
          <div className="brand-sub">{manifest.brandSubtitle}</div>
        </div>
        <select
          aria-label="Programme"
          className="brand-select"
          value={programmeId}
          onChange={(event) => onProgrammeChange(event.target.value as ProgrammeId)}
          title="Degree programme"
        >
          {programmes.map((programme) => {
            const enabled = enabledProgrammeIds.has(programme.id);
            return (
              <option
                key={programme.id}
                value={programme.id}
                disabled={!enabled}
                title={enabled ? undefined : 'Coming soon'}
              >
                {programme.displayName}{enabled ? '' : ' — Coming soon'}
              </option>
            );
          })}
        </select>
      </div>
      <div className="topnav-actions no-print">
        <button
          className="btn btn--primary topnav-keep"
          onClick={onOpenExplorer}
        >
          <BookOpen size={15} /> Course Discovery
        </button>
        <div className="segmented topnav-keep" role="group" aria-label="View mode">
          <button
            onClick={() => onViewModeChange('board')}
            aria-label="Board view"
            aria-pressed={viewMode === 'board'}
            className={viewMode === 'board' ? 'is-active' : ''}
          >
            <LayoutGrid size={14} /> Board
          </button>
          <button
            onClick={() => onViewModeChange('timetable')}
            aria-label="Timetable view"
            aria-pressed={viewMode === 'timetable'}
            className={viewMode === 'timetable' ? 'is-active' : ''}
          >
            <Calendar size={14} /> Timetable
          </button>
        </div>
        <button
          ref={moreButtonRef}
          type="button"
          className="btn btn--ghost topnav-more-toggle"
          aria-expanded={moreOpen}
          aria-controls="topnav-more-panel"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? <X size={15} /> : <Menu size={15} />}
          {moreOpen ? 'Close' : 'More'}
        </button>
        <div className="nav-divider topnav-divider" aria-hidden="true" />
        <div
          ref={panelRef}
          id="topnav-more-panel"
          className={`topnav-overflow${moreOpen ? ' is-open' : ''}`}
          role={moreOpen ? 'dialog' : undefined}
          aria-label={moreOpen ? 'More actions' : undefined}
        >
          <button className="btn btn--ghost topnav-overflow-item" onClick={dismissThen(onLoadPreset)}>
            <Zap size={15} /> Load example outline
          </button>
          <button
            className="btn btn--ghost topnav-overflow-item"
            onClick={dismissThen(onImportUnical)}
            aria-label="Import UniCal calendar link"
            title="Paste a UniCal link to prepopulate Sem 1"
          >
            <Calendar size={15} /> Import UniCal
          </button>
          {ownerSession ? (
            <button className="btn btn--ghost topnav-overflow-item" onClick={dismissThen(onLogoutOwner)} aria-label="Sign out">
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <button className="btn btn--ghost topnav-overflow-item" onClick={dismissThen(onShowLogin)} aria-label="Owner sign in">
              <LogIn size={15} /> Owner sign in
            </button>
          )}
          <button
            className="icon-btn topnav-overflow-item"
            onClick={dismissThen(onUndo)}
            disabled={undoCount === 0}
            aria-label={undoCount === 0 ? 'Undo last plan change' : `Undo last plan change (${undoCount} available)`}
            title={undoCount === 0 ? 'Undo (Ctrl+Z)' : `Undo (${undoCount}) (Ctrl+Z)`}
          >
            <Undo2 size={15} />
            <span className="topnav-overflow-text">{undoCount > 0 ? `Undo (${undoCount})` : 'Undo'}</span>
            {undoCount > 0 && (
              <span className="icon-btn__count topnav-overflow-count" aria-hidden="true">{undoCount}</span>
            )}
          </button>
          <button className="icon-btn topnav-overflow-item" onClick={dismissThen(onExport)} aria-label="Export plan JSON" title="Export JSON">
            <Download size={15} />
            <span className="topnav-overflow-text">Export plan</span>
          </button>
          <button className="icon-btn topnav-overflow-item" onClick={dismissThen(() => fileInputRef.current?.click())} aria-label="Import plan JSON" title="Import JSON">
            <Upload size={15} />
            <span className="topnav-overflow-text">Import plan</span>
          </button>
          <button className="icon-btn topnav-overflow-item" onClick={dismissThen(onShare)} aria-label="Share plan" title="Share plan as link">
            <Link2 size={15} />
            <span className="topnav-overflow-text">Share plan</span>
          </button>
          <button className="icon-btn topnav-overflow-item" onClick={dismissThen(onIcs)} aria-label="Export timetable to calendar (.ics)" title="Export .ics calendar">
            <CalendarPlus size={15} />
            <span className="topnav-overflow-text">Export calendar</span>
          </button>
          <button className="icon-btn topnav-overflow-item" onClick={dismissThen(() => window.print())} aria-label="Print plan" title="Print / save as PDF">
            <Printer size={15} />
            <span className="topnav-overflow-text">Print</span>
          </button>
          <button
            className="icon-btn topnav-overflow-item"
            onClick={dismissThen(onToggleTheme)}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span className="topnav-overflow-text">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </motion.header>
    {moreOpen && (
      <button
        type="button"
        className="topnav-sheet-backdrop"
        aria-label="Close more actions"
        onClick={() => {
          setMoreOpen(false);
          moreButtonRef.current?.focus();
        }}
      />
    )}
    </>
  );
}
