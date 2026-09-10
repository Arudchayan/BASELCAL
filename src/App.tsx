import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Zap,
  Sun,
  Moon,
  LayoutGrid,
  Calendar,
  CalendarPlus,
  Star,
  Download,
  Upload,
  Undo2,
  Link2,
  Printer,
  LogIn,
  LogOut,
} from 'lucide-react';
import { COURSES } from './courses';
import { CourseCard } from './CourseCard';
import { CourseDetailsModal } from './CourseDetailsModal';
import { ProgressPanel } from './ProgressPanel';
import { QuickTips } from './QuickTips';
import { evaluatePack, withAdmissionTarget } from './degrees/ruleEngine';
import { getPackRules, listProgrammes } from './degrees/registry';
import type { ProgrammeId } from './degrees/types';
import {
  clampAdmission,
  isOwnerSession,
  readAdmissionTarget,
  writeAdmissionTarget,
  writeUnlockedConfig,
  type StudentConfig,
} from './studentConfig';
import { LoginModal } from './LoginModal';
import { matchesSemesterFilter, parseOffering } from './offering';
import { findConflicts } from './conflicts';
import {
  STORAGE_KEYS,
  ensurePlanMigrated,
  loadPlanForProgrammeDetailed,
  savePlanForProgramme,
  notesStorageKey,
  shortlistStorageKey,
  loadJson,
  saveJson,
  exportPlanPayload,
  importPlanPayload,
  buildPresetPlan,
  buildPlanFromStudentConfig,
  allPlannedCourses,
  PLAN_DISCLAIMER,
  clearOwnerBrowserData,
} from './planStorage';
import { COVERAGE_POLICY, isDisputedModule } from './coveragePolicy';
import { buildShareUrl, readSharedPlanFromHash, clearShareHash } from './share';
import { downloadIcs } from './ics';
import {
  EXAMPLE_PLAN_ADMISSION_TARGET,
  EXAMPLE_PLAN_IDS,
  EXAMPLE_PLAN_NAME,
  SEMESTERS,
  SEMESTER_IDS,
  eligibleModulesFor,
  withCourseAllocation,
  type Course,
  type CourseModule,
  type PlanState,
  type SemesterId,
} from './types';
import { useProgramme } from './programmeContext';
import './index.css';

const CourseExplorer = lazy(() =>
  import('./CourseExplorer').then((m) => ({ default: m.CourseExplorer })),
);
const Timetable = lazy(() => import('./Timetable').then((m) => ({ default: m.Timetable })));

ensurePlanMigrated();
const PROGRAMMES = listProgrammes();

const sharedBoot = (() => {
  const shared = readSharedPlanFromHash();
  if (!shared) return null;
  const ok = window.confirm(
    'Load the shared plan from this link?\n\nIt replaces the plan saved in this browser.',
  );
  if (ok) clearShareHash();
  return ok ? shared : null;
})();

const daysSince = (iso: string): number | null => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return Number.isNaN(days) ? null : days;
};

const SEM_LOAD_MAX: Record<SemesterId, number> = { s1: 37, s2: 38, s3: 42, s4: 46 };

function App() {
  const { programmeId, setProgrammeId, manifest, enabledProgrammes } = useProgramme();
  const [initialBoot] = useState(() => loadPlanForProgrammeDetailed(programmeId));
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    loadJson<'dark' | 'light'>(STORAGE_KEYS.theme, 'light'),
  );
  const [viewMode, setViewMode] = useState<'board' | 'timetable'>('board');
  const [activeSem, setActiveSem] = useState<SemesterId>('s1');
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeCourseDetails, setActiveCourseDetails] = useState<Course | null>(null);
  const [plan, setPlan] = useState<PlanState>(() => sharedBoot ?? initialBoot.plan);
  const [startupDrops] = useState<string[]>(() => initialBoot.droppedIds);
  const [startupDupes] = useState<string[]>(() => initialBoot.duplicateIds);
  const [sharedLoaded] = useState<boolean>(() => !!sharedBoot);
  const [storageOk, setStorageOk] = useState(true);
  const storageFlags = useRef({ plan: true, theme: true, notes: true, shortlist: true, admission: true });
  const [undoStack, setUndoStack] = useState<PlanState[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>(() =>
    loadJson(notesStorageKey(programmeId), {}),
  );
  const [shortlist, setShortlist] = useState<string[]>(() =>
    loadJson(shortlistStorageKey(programmeId), []),
  );
  const [search, setSearch] = useState('');
  const [searchLower, setSearchLower] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<SemesterId | ''>('');
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [ownerSession, setOwnerSession] = useState(() => isOwnerSession());
  const [admissionTarget, setAdmissionTarget] = useState(() => readAdmissionTarget());
  const packRules = useMemo(() => getPackRules(programmeId), [programmeId]);
  const degreeRules = useMemo(
    () => withAdmissionTarget(packRules, admissionTarget),
    [packRules, admissionTarget],
  );
  const enabledProgrammeIds = useMemo(
    () => new Set(enabledProgrammes.map((programme) => programme.id)),
    [enabledProgrammes],
  );

  const reportStorage = (key: keyof typeof storageFlags.current, ok: boolean) => {
    storageFlags.current[key] = ok;
    const allOk = Object.values(storageFlags.current).every(Boolean);
    setStorageOk(allOk);
  };

  const showToast = (message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    reportStorage('theme', saveJson(STORAGE_KEYS.theme, theme));
  }, [theme]);

  useEffect(() => {
    reportStorage('plan', savePlanForProgramme(programmeId, plan));
  }, [plan, programmeId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      reportStorage('notes', saveJson(notesStorageKey(programmeId), personalNotes));
    }, 300);
    return () => window.clearTimeout(t);
  }, [personalNotes, programmeId]);

  useEffect(() => {
    reportStorage('shortlist', saveJson(shortlistStorageKey(programmeId), shortlist));
  }, [shortlist, programmeId]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchLower(search.toLowerCase()), 150);
    return () => window.clearTimeout(t);
  }, [search]);

  const pushUndo = (prev: PlanState) => {
    setUndoStack((stack) => [...stack.slice(-19), prev]);
  };

  const changeProgramme = (nextProgrammeId: ProgrammeId) => {
    if (nextProgrammeId === programmeId || !enabledProgrammeIds.has(nextProgrammeId)) return;

    reportStorage('plan', savePlanForProgramme(programmeId, plan));
    reportStorage('notes', saveJson(notesStorageKey(programmeId), personalNotes));
    reportStorage('shortlist', saveJson(shortlistStorageKey(programmeId), shortlist));

    setProgrammeId(nextProgrammeId);
    const nextBoot = loadPlanForProgrammeDetailed(nextProgrammeId);
    setPlan(nextBoot.plan);
    setPersonalNotes(loadJson(notesStorageKey(nextProgrammeId), {}));
    setShortlist(loadJson(shortlistStorageKey(nextProgrammeId), []));
    setUndoStack([]);
  };

  const updatePlan = (updater: (prev: PlanState) => PlanState) => {
    setPlan((prev) => {
      const next = updater(prev);
      pushUndo(prev);
      return next;
    });
  };

  const undo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setPlan(prev);
      return stack.slice(0, -1);
    });
  };

  const toggleShortlist = (id: string) => {
    setShortlist((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const selected = (COURSES as Course[]).find((course) => course.id === id);
      if (!selected?.projectVariantGroup) return [...prev, id];
      return [
        ...prev.filter((existingId) => {
          const existing = (COURSES as Course[]).find((course) => course.id === existingId);
          return existing?.projectVariantGroup !== selected.projectVariantGroup;
        }),
        id,
      ];
    });
  };

  const updateNote = (id: string, text: string) => {
    setPersonalNotes((prev) => ({ ...prev, [id]: text }));
  };

  const plannedCourseIds = useMemo(() => new Set(allPlannedCourses(plan).map((c) => c.id)), [plan]);
  const plannedProjectGroups = useMemo(
    () => new Set(allPlannedCourses(plan).flatMap((c) => c.projectVariantGroup ? [c.projectVariantGroup] : [])),
    [plan],
  );

  const catalogCourses = useMemo(() => {
    return (COURSES as Course[]).filter((c) => {
      const matchSearch = (c.title + ' ' + c.code + ' ' + (c.note || ''))
        .toLowerCase()
        .includes(searchLower);
      const matchModule = moduleFilter ? eligibleModulesFor(c).includes(moduleFilter as CourseModule) : true;
      const matchPriority = priorityFilter ? c.priority === priorityFilter : true;
      const matchShortlist = showShortlistOnly ? shortlist.includes(c.id) : true;
      const matchSemester = matchesSemesterFilter(c, semesterFilter);
      const notPlanned = !plannedCourseIds.has(c.id) &&
        (!c.projectVariantGroup || !plannedProjectGroups.has(c.projectVariantGroup));
      return matchSearch && matchModule && matchPriority && matchShortlist && matchSemester && notPlanned;
    });
  }, [searchLower, moduleFilter, priorityFilter, semesterFilter, plannedCourseIds, plannedProjectGroups, showShortlistOnly, shortlist]);

  const preferredSemesterFor = (course: Course): SemesterId => {
    const meta = parseOffering(course.when);
    if (meta.season === 'spring') return 's2';
    if (meta.season === 'fall') return 's1';
    if (course.id.endsWith('-2')) return 's2';
    if (course.module === 'Thesis' && course.title.toLowerCase().includes('thesis') && !course.title.toLowerCase().includes('prep')) {
      return 's4';
    }
    return 's1';
  };

  const quickAddCourse = (course: Course) => {
    if (plannedCourseIds.has(course.id) ||
      (course.projectVariantGroup && plannedProjectGroups.has(course.projectVariantGroup))) return;
    const sem = semesterFilter || preferredSemesterFor(course);
    updatePlan((prev) => ({
      ...prev,
      [sem]: [...prev[sem], course],
    }));
  };

  const allocateCourse = (sem: SemesterId, index: number, module: CourseModule) => {
    updatePlan((prev) => ({
      ...prev,
      [sem]: prev[sem].map((course, i) => i === index ? withCourseAllocation(course, module) : course),
    }));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === 'catalog') return;
      const sem = source.droppableId as SemesterId;
      updatePlan((prev) => {
        const newSemItems = Array.from(prev[sem]);
        const [reorderedItem] = newSemItems.splice(source.index, 1);
        newSemItems.splice(destination.index, 0, reorderedItem);
        return { ...prev, [sem]: newSemItems };
      });
      return;
    }

    if (source.droppableId === 'catalog') {
      const courseId = draggableId;
      const course = COURSES.find((c) => c.id === courseId) as Course | undefined;
      if (!course || plannedCourseIds.has(course.id) ||
        (course.projectVariantGroup && plannedProjectGroups.has(course.projectVariantGroup))) return;
      const destSem = destination.droppableId as SemesterId;
      updatePlan((prev) => {
        const newDestItems = Array.from(prev[destSem]);
        newDestItems.splice(destination.index, 0, course);
        return { ...prev, [destSem]: newDestItems };
      });
      return;
    }

    if (destination.droppableId === 'catalog') {
      const sourceSem = source.droppableId as SemesterId;
      updatePlan((prev) => {
        const newSourceItems = Array.from(prev[sourceSem]);
        newSourceItems.splice(source.index, 1);
        return { ...prev, [sourceSem]: newSourceItems };
      });
      return;
    }

    const sourceSem = source.droppableId as SemesterId;
    const destSem = destination.droppableId as SemesterId;
    updatePlan((prev) => {
      const newSourceItems = Array.from(prev[sourceSem]);
      const newDestItems = Array.from(prev[destSem]);
      const [movedItem] = newSourceItems.splice(source.index, 1);
      if (newDestItems.some((c) => c.id === movedItem.id)) {
        return prev;
      }
      newDestItems.splice(destination.index, 0, movedItem);
      return { ...prev, [sourceSem]: newSourceItems, [destSem]: newDestItems };
    });
  };

  const removeCourse = (semId: SemesterId, index: number) => {
    updatePlan((prev) => {
      const newItems = Array.from(prev[semId]);
      newItems.splice(index, 1);
      return { ...prev, [semId]: newItems };
    });
  };

  const loadPreset = () => {
    const admissionLine = EXAMPLE_PLAN_ADMISSION_TARGET > 0
      ? `• It also demonstrates a typical ${EXAMPLE_PLAN_ADMISSION_TARGET} CP admission (Auflagen) package\n` +
        `• Loading it sets your admission target to ${EXAMPLE_PLAN_ADMISSION_TARGET} CP — change that later to match your letter\n`
      : '• Master’s courses only — no admission (Auflagen) package. Set your own target from your letter.\n';
    const ok = confirm(
      `Load ${EXAMPLE_PLAN_NAME}? This replaces your current board.\n\n` +
        'This is a sample outline, not an official University of Basel recommendation.\n' +
        `• It is built to meet the official ${manifest.totalCp} CP MSc rules\n` +
        admissionLine +
        '• Spring 2027 and later offerings are provisional and need a live VV check\n\n' +
        'Continue?',
    );
    if (ok) {
      setAdmissionTarget(EXAMPLE_PLAN_ADMISSION_TARGET);
      writeAdmissionTarget(EXAMPLE_PLAN_ADMISSION_TARGET);
      updatePlan(() => buildPresetPlan(EXAMPLE_PLAN_IDS));
    }
  };

  const applyOwnerConfig = (raw: unknown) => {
    const overlay = raw && typeof raw === 'object' ? raw as StudentConfig : {};
    writeUnlockedConfig(overlay);
    setOwnerSession(true);
    if (typeof overlay.admissionTarget === 'number') {
      const next = clampAdmission(overlay.admissionTarget);
      setAdmissionTarget(next);
      writeAdmissionTarget(next);
    }
    const next = buildPlanFromStudentConfig(overlay);
    setPlan(next.plan);
    savePlanForProgramme(programmeId, next.plan);
    setShowLogin(false);
    showToast(overlay.seedPlan ? 'Owner overlay unlocked' : 'Signed in');
  };

  const logoutOwner = () => {
    clearOwnerBrowserData();
    window.location.reload();
  };

  const handleExport = () => {
    const payload = exportPlanPayload(plan, personalNotes, shortlist, admissionTarget);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baselcal-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (allPlannedCourses(plan).length === 0) {
      showToast('Nothing to share — add courses or load the example outline');
      return;
    }
    const url = buildShareUrl(plan);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied — anyone opening it sees this exact plan');
    } catch {
      window.prompt('Copy this share link:', url);
    }
  };

  const handleIcs = () => {
    const hasSlots = SEMESTER_IDS.some((sem) =>
      plan[sem].some((course) => (course.schedule?.length ?? 0) > 0),
    );
    if (!hasSlots) {
      showToast('No weekly slots to export — add scheduled courses or load the example outline');
      return;
    }
    downloadIcs(plan, PLAN_DISCLAIMER);
    showToast('Calendar file downloaded — weekly slots included');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imported = importPlanPayload(data);
      if (!imported) {
        alert('Unrecognized plan file format.');
        return;
      }
      const ok = window.confirm('Import this plan file? It replaces your current board.');
      if (!ok) return;
      const nextAdmission =
        typeof imported.admissionTarget === 'number' ? imported.admissionTarget : admissionTarget;
      if (nextAdmission !== admissionTarget) {
        setAdmissionTarget(nextAdmission);
        reportStorage('admission', writeAdmissionTarget(nextAdmission));
      }
      updatePlan(() => imported.plan);
      if (imported.notes && typeof imported.notes === 'object') setPersonalNotes(imported.notes);
      if (imported.shortlist) setShortlist(imported.shortlist);
      const courses = allPlannedCourses(imported.plan);
      const ev = evaluatePack(courses, packRules, nextAdmission);
      const conflictCount = SEMESTER_IDS.reduce((n, sem) => n + findConflicts(imported.plan[sem]).length, 0);
      const disputedCount = courses.filter((c) => isDisputedModule(c.id)).length;
      const missingSched = courses.filter(
        (c) =>
          c.type !== 'Admission' &&
          c.module !== 'Thesis' &&
          !(c.when || '').toLowerCase().includes('learning contract') &&
          (!c.schedule || c.schedule.length === 0),
      ).length;
      const caveats: string[] = [];
      if (conflictCount > 0) caveats.push(`${conflictCount} timetable conflict(s)`);
      if (disputedCount > 0) caveats.push(`${disputedCount} disputed module(s)`);
      if (missingSched > 0) caveats.push(`${missingSched} schedule-unknown`);
      const status = ev.isComplete
        ? caveats.length
          ? `Buckets OK — but check: ${caveats.join('; ')}.`
          : 'All buckets OK and no conflict/dispute/schedule caveats flagged.'
        : ev.issues.slice(0, 3).join('; ');
      const dropped =
        imported.droppedIds.length > 0
          ? ` Dropped unknown IDs: ${imported.droppedIds.slice(0, 8).join(', ')}${
              imported.droppedIds.length > 8 ? '…' : ''
            }.`
          : '';
      const dups =
        imported.duplicateIds.length > 0
          ? ` Skipped duplicate placements: ${imported.duplicateIds.slice(0, 6).join(', ')}.`
          : '';
      alert(
        `Imported plan. MSc ${ev.stats.mscTotal}/${ev.rules.mscTotal.target}, grand ${ev.stats.grandTotal}/${ev.rules.grandTotal.target}. ${status}${dropped}${dups}`,
      );
    } catch {
      alert('Failed to import plan JSON.');
    }
  };

  const verifiedDays = daysSince(COVERAGE_POLICY.lastVerified.date);

  return (
    <div className="app-shell" style={{ padding: '20px 32px 48px', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      {(startupDrops.length > 0 || startupDupes.length > 0 || !storageOk || sharedLoaded) && (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--warn-bg)',
            border: '1px solid var(--warn)',
            color: 'var(--warn)',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {sharedLoaded && (
            <p style={{ margin: '0 0 6px' }}>
              Loaded a shared plan from this link. It is now the saved plan in this browser.
            </p>
          )}
          {!storageOk && (
            <p style={{ margin: '0 0 6px' }}>
              Browser storage is unavailable (private mode or quota). Changes may not persist after reload.
            </p>
          )}
          {startupDrops.length > 0 && (
            <p style={{ margin: '0 0 6px' }}>
              Dropped {startupDrops.length} unknown course ID(s) from saved plan:{' '}
              {startupDrops.slice(0, 8).join(', ')}
              {startupDrops.length > 8 ? '…' : ''}.
            </p>
          )}
          {startupDupes.length > 0 && (
            <p style={{ margin: 0 }}>
              Skipped {startupDupes.length} duplicate cross-semester placement(s):{' '}
              {startupDupes.slice(0, 8).join(', ')}
              {startupDupes.length > 8 ? '…' : ''}.
            </p>
          )}
        </div>
      )}

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
            onChange={(event) => changeProgramme(event.target.value as ProgrammeId)}
            title="Degree programme"
            style={{ padding: '7px 9px', minWidth: 150 }}
          >
            {PROGRAMMES.map((programme) => {
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
            onClick={() => setShowExplorer(true)}
          >
            <BookOpen size={15} /> Course Discovery
          </button>
          <div className="segmented" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('board')}
              aria-label="Board view"
              className={viewMode === 'board' ? 'is-active' : ''}
            >
              <LayoutGrid size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              aria-label="Timetable view"
              className={viewMode === 'timetable' ? 'is-active' : ''}
            >
              <Calendar size={14} /> Timetable
            </button>
          </div>
          <div className="nav-divider" />
          <button className="btn btn--ghost" onClick={loadPreset}>
            <Zap size={15} /> Load example outline
          </button>
          {ownerSession ? (
            <button className="btn btn--ghost" onClick={logoutOwner} aria-label="Sign out">
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <button className="btn btn--ghost" onClick={() => setShowLogin(true)} aria-label="Owner login">
              <LogIn size={15} /> Sign in
            </button>
          )}
          <button
            className="icon-btn"
            onClick={undo}
            disabled={undoStack.length === 0}
            aria-label="Undo last plan change"
            title="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button className="icon-btn" onClick={handleExport} aria-label="Export plan JSON" title="Export JSON">
            <Download size={15} />
          </button>
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Import plan JSON" title="Import JSON">
            <Upload size={15} />
          </button>
          <button className="icon-btn" onClick={() => void handleShare()} aria-label="Copy share link" title="Share plan as link">
            <Link2 size={15} />
          </button>
          <button className="icon-btn" onClick={handleIcs} aria-label="Export timetable to calendar (.ics)" title="Export .ics calendar">
            <CalendarPlus size={15} />
          </button>
          <button className="icon-btn" onClick={() => window.print()} aria-label="Print plan" title="Print / save as PDF">
            <Printer size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
              if (f) void handleImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </motion.header>

      <div className="subbar" style={{ marginTop: 8 }}>
        <span role="note">{PLAN_DISCLAIMER}</span>
        <label className="admission-control" title="From your Zulassungsbescheid. 0 means no extra admission conditions.">
          <span>Auflagen</span>
          <input
            type="number"
            min={0}
            max={80}
            step={1}
            value={admissionTarget}
            aria-label="Admission conditions in CP"
            onChange={(e) => {
              const next = clampAdmission(Number(e.target.value) || 0);
              setAdmissionTarget(next);
              reportStorage('admission', writeAdmissionTarget(next));
            }}
          />
          <span>CP</span>
        </label>
        <span
          title={COVERAGE_POLICY.lastVerified.moduleManifestComplete
            ? `Fall 2026 VV module tree verified: ${COVERAGE_POLICY.lastVerified.fall2026UniqueCourses ?? 0} unique courses across ${COVERAGE_POLICY.lastVerified.fall2026ModuleEntries ?? 0} module entries`
            : 'VV module manifest is incomplete; verify module membership before enrolling'}
          style={{ cursor: 'help', whiteSpace: 'nowrap' }}
        >
          Catalog reviewed {COVERAGE_POLICY.lastVerified.date}
          {verifiedDays !== null ? ` (${verifiedDays}d ago)` : ''} ·{' '}
          {COVERAGE_POLICY.staleWatchIds.length} stale/irregular offerings flagged
          {!COVERAGE_POLICY.lastVerified.moduleManifestComplete
            ? ` · VV manifest incomplete — ${COVERAGE_POLICY.lastVerified.catalogCoursesWithVvDetail} pages verified`
            : ''}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'board' ? (
          <motion.div key="board" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="board-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, marginTop: 20 }}>
                <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="glass-panel no-print" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 140px)', position: 'sticky', top: 84 }}>
                  <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <h2 style={{ fontSize: 16 }}>Course Catalog</h2>
                      <span className="micro-label">{catalogCourses.length} available</span>
                    </div>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <Search size={16} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search courses…"
                        aria-label="Search courses"
                        style={{ width: '100%', padding: '9px 12px 9px 34px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        aria-label="Filter by module"
                        style={{ flex: 1, minWidth: 120, padding: '7px 8px' }}
                      >
                        <option value="">All modules</option>
                        <option value="Admission requirement">Admission Req</option>
                        <option value="Mathematical Foundations">Math Foundations</option>
                        <option value="Machine Learning Foundations">ML Foundations</option>
                        <option value="Systems Foundations">Systems Foundations</option>
                        <option value="Electives in Data Science">Electives</option>
                        <option value="Thesis">Thesis</option>
                      </select>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        aria-label="Filter by priority"
                        style={{ flex: 1, minWidth: 100, padding: '7px 8px' }}
                      >
                        <option value="">All priorities</option>
                        <option value="Must">Must</option>
                        <option value="Very high">Very high</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                      </select>
                      <select
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value as SemesterId | '')}
                        aria-label="Filter by semester offering"
                        style={{ flex: 1, minWidth: 120, padding: '7px 8px' }}
                      >
                        <option value="">All semesters</option>
                        {SEMESTERS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showShortlistOnly} onChange={(e) => setShowShortlistOnly(e.target.checked)} />
                      <Star size={13} /> Wishlist only
                    </label>
                  </div>
                  <Droppable droppableId="catalog">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          padding: 16,
                          overflowY: 'auto',
                          flex: 1,
                          background: snapshot.isDraggingOver ? 'var(--glass-hover-bg)' : 'transparent',
                        }}
                      >
                        {catalogCourses.map((course, index) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            index={index}
                            isPlanned={false}
                            noteText={personalNotes[course.id]}
                            onNoteChange={(text) => updateNote(course.id, text)}
                            onShowDetails={() => setActiveCourseDetails(course)}
                            onQuickAdd={() => quickAddCourse(course)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </motion.div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <ProgressPanel plan={plan} courses={allPlannedCourses(plan)} admissionTarget={admissionTarget} />

                  <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="semester-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, flex: 1 }}
                  >
                    {SEMESTERS.map((sem) => {
                      const semId = sem.id as SemesterId;
                      const cp = plan[semId].reduce((sum, c) => sum + c.cp, 0);
                      const max = SEM_LOAD_MAX[semId];
                      const ratio = cp / max;
                      const loadColor = ratio > 1.05 ? 'var(--bad)' : ratio > 0.95 ? 'var(--warn)' : 'var(--module-math)';
                      return (
                        <div key={sem.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                              <h3 style={{ fontSize: 13.5 }}>{sem.title}</h3>
                              <span className="num" style={{ fontSize: 12, fontWeight: 600, color: ratio > 1 ? 'var(--bad)' : 'var(--text-muted)' }}>
                                {cp} CP
                              </span>
                            </div>
                            <div className="load-bar" title={`Recommended max ${max} CP`}>
                              <div className="load-bar-fill" style={{ width: `${Math.min(100, ratio * 100)}%`, background: loadColor }} />
                            </div>
                          </div>
                          <Droppable droppableId={sem.id}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                  padding: 14,
                                  flex: 1,
                                  minHeight: 380,
                                  background: snapshot.isDraggingOver ? 'var(--glass-hover-bg)' : 'transparent',
                                  transition: 'background 0.2s ease',
                                }}
                              >
                                {plan[semId].length === 0 && (
                                  <p style={{ margin: '8px 4px 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    Drop courses here, or load the example outline.
                                  </p>
                                )}
                                {plan[semId].map((course, index) => (
                                  <CourseCard
                                    key={course.id + '_planned'}
                                    course={course}
                                    index={index}
                                    isPlanned
                                    currentSemId={semId}
                                    onRemove={() => removeCourse(semId, index)}
                                    noteText={personalNotes[course.id]}
                                    onNoteChange={(text) => updateNote(course.id, text)}
                                    onShowDetails={() => setActiveCourseDetails(course)}
                                    onAllocationChange={(module) => allocateCourse(semId, index, module)}
                                  />
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </DragDropContext>
          </motion.div>
        ) : (
          <motion.div key="timetable" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ minHeight: 600, marginTop: 20 }}>
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading timetable…</div>}>
              <Timetable plan={plan} activeSem={activeSem} setActiveSem={setActiveSem} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickTips admissionTarget={admissionTarget} grandTotal={degreeRules.grandTotal.target} />

      {activeCourseDetails && (
        <CourseDetailsModal course={activeCourseDetails} onClose={() => setActiveCourseDetails(null)} />
      )}

      <AnimatePresence>
        {showLogin && (
          <LoginModal onClose={() => setShowLogin(false)} onUnlocked={applyOwnerConfig} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExplorer && (
          <Suspense fallback={null}>
            <CourseExplorer
              shortlist={shortlist}
              toggleShortlist={toggleShortlist}
              onClose={() => setShowExplorer(false)}
              admissionTarget={admissionTarget}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast no-print"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
