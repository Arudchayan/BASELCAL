import type { Course, ScheduleSession } from './types';

export type TimedSession = ScheduleSession & {
  course: Course;
  start: number;
  end: number;
};

export function parseTimeRange(timeStr: string): { start: number; end: number } | null {
  if (!timeStr || !timeStr.includes('-')) return null;
  const parts = timeStr.split('-');
  const startParts = parts[0].trim().split(':');
  const endParts = parts[1].trim().split(':');
  if (startParts.length !== 2 || endParts.length !== 2) return null;
  const startH = Number(startParts[0]);
  const startM = Number(startParts[1]);
  const endH = Number(endParts[0]);
  const endM = Number(endParts[1]);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return null;
  return {
    start: startH + startM / 60,
    end: endH + endM / 60,
  };
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Greedy interval graph coloring: assign columns so overlapping sessions
 * never share a column. Returns colIndex and colCount per session (same order as input).
 */
export function assignColumns(sessions: TimedSession[]): Array<{ colIndex: number; colCount: number }> {
  if (sessions.length === 0) return [];

  const indexed = sessions.map((s, i) => ({ s, i }));
  indexed.sort((a, b) => {
    if (a.s.start !== b.s.start) return a.s.start - b.s.start;
    if (a.s.end !== b.s.end) return a.s.end - b.s.end;
    return a.s.course.title.localeCompare(b.s.course.title);
  });

  const colOf: number[] = new Array(sessions.length).fill(0);
  const active: Array<{ end: number; col: number }> = [];

  for (const { s, i } of indexed) {
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].end <= s.start) active.splice(k, 1);
    }
    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col += 1;
    colOf[i] = col;
    active.push({ end: s.end, col });
  }

  // Per connected-overlap component, colCount = max(col)+1 among members
  const n = sessions.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (overlaps(sessions[i], sessions[j])) union(i, j);
    }
  }

  const maxColByRoot = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    maxColByRoot.set(r, Math.max(maxColByRoot.get(r) ?? 0, colOf[i]));
  }

  return sessions.map((_, i) => ({
    colIndex: colOf[i],
    colCount: (maxColByRoot.get(find(i)) ?? 0) + 1,
  }));
}

export function collectDaySessions(courses: Course[], day: string): TimedSession[] {
  const out: TimedSession[] = [];
  for (const course of courses) {
    for (const sess of course.schedule || []) {
      if (sess.day !== day) continue;
      const range = parseTimeRange(sess.time);
      if (!range) continue;
      // Include sessions even outside 08–19 so they appear in conflict reports
      out.push({ ...sess, course, start: range.start, end: range.end });
    }
  }
  return out;
}

export type ConflictPair = {
  day: string;
  timeA: string;
  timeB: string;
  courseA: Course;
  courseB: Course;
};

export function findConflicts(courses: Course[]): ConflictPair[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const pairs: ConflictPair[] = [];
  const seen = new Set<string>();

  for (const day of days) {
    const sessions = collectDaySessions(courses, day);
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i];
        const b = sessions[j];
        if (!overlaps(a, b)) continue;
        const key = [a.course.id, b.course.id, day].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({
          day,
          timeA: a.time,
          timeB: b.time,
          courseA: a.course,
          courseB: b.course,
        });
      }
    }
  }
  return pairs;
}

export function isMandatoryAttendance(course: Course): boolean {
  const exam = (course.exam || '').toLowerCase();
  const title = (course.title || '').toLowerCase();
  const when = (course.when || '').toLowerCase();
  // Learning contracts / thesis are not fixed physical attendance
  if (when.includes('learning contract')) return false;
  if (title.includes('thesis')) return false;
  // Explicit optional language (e.g. Sci Comp lecture exercises "warmly recommended")
  if (
    exam.includes('not mandatory') ||
    exam.includes('warmly recommended') ||
    exam.includes('not compulsory')
  ) {
    // Still mandatory if the course itself is graded via continuous assessment / practical
    // and is not the pure "lecture exam" path — practicals stay mandatory.
    if (title.includes('practical') || when.includes('practical')) return true;
  }
  if (title.includes('practical') || title.includes('seminar')) return true;
  if (title.includes('practical course')) return true;
  // Any continuous-assessment / participation course with a schedule is attendance-sensitive
  if (
    exam.includes('continuous') ||
    exam.includes('active') ||
    exam.includes('participation') ||
    exam.includes('homework') ||
    exam.includes('project') ||
    exam.includes('presentation')
  ) {
    return true;
  }
  // Scheduled lectures with a final exam still occupy the slot — treat as mandatory for clash UI
  if ((course.schedule || []).length > 0 && (exam.includes('exam') || exam.includes('examen'))) {
    return true;
  }
  return false;
}

/** True when both courses look attendance-sensitive (used to highlight hard clashes). */
export function isHardClash(a: Course, b: Course): boolean {
  return isMandatoryAttendance(a) && isMandatoryAttendance(b);
}
