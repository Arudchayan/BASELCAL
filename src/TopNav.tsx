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
  Moon,
  Printer,
  Sun,
  Undo2,
  Upload,
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
  onShare: () => void;
  onIcs: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}) {
  return (
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
          value={programmeId}
          onChange={(event) => onProgrammeChange(event.target.value as ProgrammeId)}
          title="Degree programme"
          style={{ padding: '7px 9px', minWidth: 150 }}
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
          className="btn btn--primary"
          onClick={onOpenExplorer}
        >
          <BookOpen size={15} /> Course Discovery
        </button>
        <div className="segmented" role="group" aria-label="View mode">
          <button
            onClick={() => onViewModeChange('board')}
            aria-label="Board view"
            className={viewMode === 'board' ? 'is-active' : ''}
          >
            <LayoutGrid size={14} /> Board
          </button>
          <button
            onClick={() => onViewModeChange('timetable')}
            aria-label="Timetable view"
            className={viewMode === 'timetable' ? 'is-active' : ''}
          >
            <Calendar size={14} /> Timetable
          </button>
        </div>
        <div className="nav-divider" />
        <button className="btn btn--ghost" onClick={onLoadPreset}>
          <Zap size={15} /> Load example outline
        </button>
        {ownerSession ? (
          <button className="btn btn--ghost" onClick={onLogoutOwner} aria-label="Sign out">
            <LogOut size={15} /> Sign out
          </button>
        ) : (
          <button className="btn btn--ghost" onClick={onShowLogin} aria-label="Owner login">
            <LogIn size={15} /> Sign in
          </button>
        )}
        <button
          className="icon-btn"
          onClick={onUndo}
          disabled={undoCount === 0}
          aria-label={undoCount === 0 ? 'Undo last plan change' : `Undo last plan change (${undoCount} available)`}
          title={undoCount === 0 ? 'Undo (Ctrl+Z)' : `Undo (${undoCount}) (Ctrl+Z)`}
        >
          <Undo2 size={15} />
          {undoCount > 0 && (
            <span className="icon-btn__count" aria-hidden="true">{undoCount}</span>
          )}
        </button>
        <button className="icon-btn" onClick={onExport} aria-label="Export plan JSON" title="Export JSON">
          <Download size={15} />
        </button>
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Import plan JSON" title="Import JSON">
          <Upload size={15} />
        </button>
        <button className="icon-btn" onClick={onShare} aria-label="Share plan" title="Share plan as link">
          <Link2 size={15} />
        </button>
        <button className="icon-btn" onClick={onIcs} aria-label="Export timetable to calendar (.ics)" title="Export .ics calendar">
          <CalendarPlus size={15} />
        </button>
        <button className="icon-btn" onClick={() => window.print()} aria-label="Print plan" title="Print / save as PDF">
          <Printer size={15} />
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
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
  );
}
