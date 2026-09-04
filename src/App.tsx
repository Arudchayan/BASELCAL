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
  Star,
  Download,
  Upload,
  Undo2,
} from 'lucide-react';
import { COURSES } from './courses';
import { CourseCard } from './CourseCard';
import { CourseDetailsModal } from './CourseDetailsModal';
import { ProgressPanel } from './ProgressPanel';
import { QuickTips } from './QuickTips';
import { evaluatePlan, DEGREE_RULES } from './degreeRules';
import { matchesSemesterFilter, parseOffering } from './offering';
import { findConflicts } from './conflicts';
import {
  STORAGE_KEYS,
  loadPlanFromStorageDetailed,
  savePlanToStorage,
  loadJson,
  saveJson,
  exportPlanPayload,
  importPlanPayload,
  buildPresetPlan,
  allPlannedCourses,
  PLAN_DISCLAIMER,
} from './planStorage';
import { DATA_FRESHNESS } from './dataFreshness';
import { COVERAGE_POLICY, isDisputedModule } from './coveragePolicy';
import {
  ML_PHD_PRESET_IDS, SEMESTERS, SEMESTER_IDS, eligibleModulesFor, withCourseAllocation,
  type Course, type CourseModule, type PlanState, type SemesterId,
} from './types';
import './index.css';

const CourseExplorer = lazy(() =>
  import('./CourseExplorer').then((m) => ({ default: m.CourseExplorer })),
);
const Timetable = lazy(() => import('./Timetable').then((m) => ({ default: m.Timetable })));

const boot = loadPlanFromStorageDetailed();

// ponytail: single helper, inline IIFE in JSX is unreadable
const daysSince = (iso: string): number | null => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return Number.isNaN(days) ? null : days;
};

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    loadJson<'dark' | 'light'>(STORAGE_KEYS.theme, 'dark'),
  );
  const [viewMode, setViewMode] = useState<'board' | 'timetable'>('board');
  const [activeSem, setActiveSem] = useState<SemesterId>('s1');
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeCourseDetails, setActiveCourseDetails] = useState<Course | null>(null);
  const [plan, setPlan] = useState<PlanState>(() => boot.plan);
  const [startupDrops] = useState<string[]>(() => boot.droppedIds);
  const [startupDupes] = useState<string[]>(() => boot.duplicateIds);
  const [storageOk, setStorageOk] = useState(true);
  const storageFlags = useRef({ plan: true, theme: true, notes: true, shortlist: true });
  const [undoStack, setUndoStack] = useState<PlanState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>(() =>
    loadJson(STORAGE_KEYS.notes, {}),
  );
  const [shortlist, setShortlist] = useState<string[]>(() => loadJson(STORAGE_KEYS.shortlist, []));
  const [search, setSearch] = useState('');
  const [searchLower, setSearchLower] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<SemesterId | ''>('');
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);

  const reportStorage = (key: keyof typeof storageFlags.current, ok: boolean) => {
    storageFlags.current[key] = ok;
    const allOk = Object.values(storageFlags.current).every(Boolean);
    setStorageOk(allOk);
  };

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    reportStorage('theme', saveJson(STORAGE_KEYS.theme, theme));
  }, [theme]);

  useEffect(() => {
    reportStorage('plan', savePlanToStorage(plan));
  }, [plan]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      reportStorage('notes', saveJson(STORAGE_KEYS.notes, personalNotes));
    }, 300);
    return () => window.clearTimeout(t);
  }, [personalNotes]);

  useEffect(() => {
    reportStorage('shortlist', saveJson(STORAGE_KEYS.shortlist, shortlist));
  }, [shortlist]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchLower(search.toLowerCase()), 150);
    return () => window.clearTimeout(t);
  }, [search]);

  const pushUndo = (prev: PlanState) => {
    setUndoStack((stack) => [...stack.slice(-19), prev]);
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
      return [...prev.filter((existingId) =>
        (COURSES as Course[]).find((course) => course.id === existingId)?.projectVariantGroup !== selected.projectVariantGroup), id];
    });
  };

  const updateNote = (id: string, text: string) => {
    setPersonalNotes((prev) => ({ ...prev, [id]: text }));
  };

  const plannedCourseIds = useMemo(() => new Set(allPlannedCourses(plan).map((c) => c.id)), [plan]);
  const plannedProjectGroups = useMemo(() => new Set(
    allPlannedCourses(plan).flatMap((c) => c.projectVariantGroup ? [c.projectVariantGroup] : []),
  ), [plan]);

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
    const ok = confirm(
      'Load ML/PhD Starter Plan? This replaces your current plan.\n\n' +
        `This approved preset totals 149 CP (121 MSc), 1 CP above the exact ${DEGREE_RULES.grandTotal.target}/${DEGREE_RULES.mscTotal.target} targets:\n` +
        '• Semester 1 is preserved exactly as the confirmed Fall 2026 selection\n' +
        '• Spring 2027 and later offerings and timetable slots are provisional\n' +
        '• Confirm RL and Inverse Problems availability before enrollment\n' +
        '• Cached historical slots show ML/E-53822 and M-66096/ML-67343 overlaps; recheck live schedules\n\n' +
        'Continue?',
    );
    if (ok) {
      updatePlan(() => buildPresetPlan(ML_PHD_PRESET_IDS));
    }
  };

  const handleExport = () => {
    const payload = exportPlanPayload(plan, personalNotes, shortlist);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baselcal-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
      updatePlan(() => imported.plan);
      if (imported.notes) setPersonalNotes(imported.notes);
      if (imported.shortlist) setShortlist(imported.shortlist);
      const courses = allPlannedCourses(imported.plan);
      const ev = evaluatePlan(courses);
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
        `Imported plan. MSc ${ev.stats.mscTotal}/${DEGREE_RULES.mscTotal.target}, grand ${ev.stats.grandTotal}/${DEGREE_RULES.grandTotal.target}. ${status}${dropped}${dups}`,
      );
    } catch {
      alert('Failed to import plan JSON.');
    }
  };

  return (
    <div className="app-shell" style={{ padding: '32px 40px', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      {(startupDrops.length > 0 || startupDupes.length > 0 || !storageOk) && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(217, 119, 6, 0.12)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            color: '#d97706',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
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
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>
        Catalog reviewed {DATA_FRESHNESS.lastReviewed} (
        {daysSince(DATA_FRESHNESS.lastReviewed) ?? '?'} days ago) ·{' '}
        {DATA_FRESHNESS.staleWatchIds.length} stale/irregular offerings flagged
        {!DATA_FRESHNESS.moduleManifestComplete
          ? ` · VV module manifest incomplete — ${COVERAGE_POLICY.lastVerified.catalogCoursesWithVvDetail} VV detail pages verified ${COVERAGE_POLICY.lastVerified.date}`
          : ''}
        <span
          title="VV module tree leaves empty — completeness vs VV manifest not yet proven (see COVERAGE_VERIFICATION_PLAN.md Phase 1)"
          style={{ cursor: 'help' }}
        >
          {' '}
          Why?
        </span>
        .
      </p>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel"
        style={{ padding: '32px', marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1
              style={{
                fontSize: '36px',
                background: 'linear-gradient(to right, var(--text-primary), var(--text-muted))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MSc Data Science Curriculum Architect
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '800px', lineHeight: 1.5 }}>
              Plan your University of Basel Data Science Master&apos;s. Validates exact admission ({DEGREE_RULES.admission.target}{' '}
              CP), MSc ({DEGREE_RULES.mscTotal.target} CP), and grand total ({DEGREE_RULES.grandTotal.target} CP). Wishlist
              in Discovery is separate from your committed board plan.
            </p>
            <p
              role="note"
              style={{
                marginTop: 12,
                maxWidth: 800,
                fontSize: 12,
                lineHeight: 1.45,
                color: 'var(--text-muted)',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              {PLAN_DISCLAIMER}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExplorer(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              <BookOpen size={16} /> Course Discovery
            </motion.button>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => setViewMode('board')}
                aria-label="Board view"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'board' ? 'var(--bg-tertiary)' : 'transparent',
                  color: viewMode === 'board' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: viewMode === 'board' ? 'bold' : 'normal',
                }}
              >
                <LayoutGrid size={16} /> Board
              </button>
              <button
                onClick={() => setViewMode('timetable')}
                aria-label="Timetable view"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'timetable' ? 'var(--bg-tertiary)' : 'transparent',
                  color: viewMode === 'timetable' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: viewMode === 'timetable' ? 'bold' : 'normal',
                }}
              >
                <Calendar size={16} /> Timetable
              </button>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 8,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            onClick={loadPreset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            <Zap size={18} /> Load ML/PhD Preset
          </button>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            aria-label="Undo last plan change"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: undoStack.length ? 'pointer' : 'not-allowed',
              opacity: undoStack.length ? 1 : 0.5,
            }}
          >
            <Undo2 size={16} /> Undo
          </button>
          <button
            onClick={handleExport}
            aria-label="Export plan JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import plan JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <Upload size={16} /> Import
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

      <AnimatePresence mode="wait">
        {viewMode === 'board' ? (
          <motion.div key="board" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="board-layout" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32 }}>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)', position: 'sticky', top: 24 }}>
                  <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                    <h2 style={{ fontSize: 18, marginBottom: 12 }}>Course Catalog</h2>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search courses…"
                        aria-label="Search courses"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 40px',
                          borderRadius: 10,
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        aria-label="Filter by module"
                        style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
                        style={{ flex: 1, minWidth: 100, padding: 8, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
                        style={{ flex: 1, minWidth: 120, padding: 8, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <option value="">All semesters</option>
                        {SEMESTERS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showShortlistOnly} onChange={(e) => setShowShortlistOnly(e.target.checked)} />
                      <Star size={14} /> Wishlist only
                    </label>
                  </div>
                  <Droppable droppableId="catalog">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          padding: 20,
                          overflowY: 'auto',
                          flex: 1,
                          background: snapshot.isDraggingOver ? 'rgba(128,128,128,0.05)' : 'transparent',
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <ProgressPanel plan={plan} courses={allPlannedCourses(plan)} />

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="semester-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, flex: 1 }}
                  >
                    {SEMESTERS.map((sem) => (
                      <div key={sem.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                          style={{
                            padding: 16,
                            borderBottom: '1px solid var(--border-subtle)',
                            background: 'var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <h3 style={{ fontSize: 15 }}>{sem.title}</h3>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            {plan[sem.id as SemesterId].reduce((sum, c) => sum + c.cp, 0)} CP
                          </span>
                        </div>
                        <Droppable droppableId={sem.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{
                                padding: 16,
                                flex: 1,
                                minHeight: 400,
                                background: snapshot.isDraggingOver ? 'var(--border-subtle)' : 'transparent',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              {plan[sem.id as SemesterId].map((course, index) => (
                                <CourseCard
                                  key={course.id + '_planned'}
                                  course={course}
                                  index={index}
                                  isPlanned
                                  currentSemId={sem.id as SemesterId}
                                  onRemove={() => removeCourse(sem.id as SemesterId, index)}
                                  noteText={personalNotes[course.id]}
                                  onNoteChange={(text) => updateNote(course.id, text)}
                                  onShowDetails={() => setActiveCourseDetails(course)}
                                  onAllocationChange={(module) => allocateCourse(sem.id as SemesterId, index, module)}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </DragDropContext>
          </motion.div>
        ) : (
          <motion.div key="timetable" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ minHeight: 600 }}>
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading timetable…</div>}>
              <Timetable plan={plan} activeSem={activeSem} setActiveSem={setActiveSem} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickTips />

      {activeCourseDetails && (
        <CourseDetailsModal course={activeCourseDetails} onClose={() => setActiveCourseDetails(null)} />
      )}

      <AnimatePresence>
        {showExplorer && (
          <Suspense fallback={null}>
            <CourseExplorer
              shortlist={shortlist}
              toggleShortlist={toggleShortlist}
              onClose={() => setShowExplorer(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
