import { COURSES } from './courses';
import type { Course, ScheduleSession } from './types';
import { deDateToIso } from './scheduleDates';

export {
  addDays,
  deDateToIso,
  mondayOfWeek,
  parseIsoDate,
  sessionActiveInWeek,
  toIsoDate,
} from './scheduleDates';

const DAY_DE_TO_EN: Record<string, string> = {
  montag: 'Monday',
  dienstag: 'Tuesday',
  mittwoch: 'Wednesday',
  donnerstag: 'Thursday',
  freitag: 'Friday',
  samstag: 'Saturday',
  sonntag: 'Sunday',
};

export type UnicalParseResult =
  | { ok: true; eventIds: string[]; raw: string }
  | { ok: false; error: string };

export type UnicalMapResult = {
  matched: Course[];
  unknownIds: string[];
  ambiguous: { vvId: string; candidates: Course[] }[];
};

export type UnicalResolvedSession = ScheduleSession & {
  from: string;
  until: string;
};

export type UnicalResolvedEvent = {
  vvId: string;
  title?: string;
  schedule: UnicalResolvedSession[];
};

/** Strip leading zeros from UniCal / VV event ids (`00302796` → `302796`). */
export function normalizeEventId(id: string): string {
  const trimmed = String(id || '').trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^0+/, '');
  return normalized || '0';
}

export function extractVvIdFromCourseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('id');
    if (id && /^\d+$/.test(id)) return normalizeEventId(id);
  } catch {
    const match = url.match(/[?&]id=(\d+)/i);
    if (match) return normalizeEventId(match[1]);
  }
  return null;
}

/**
 * Accept a full UniCal URL, a bare `e=` query fragment, or a comma-separated
 * list of event ids. Returns normalized VV ids (no leading zeros).
 */
export function parseUnicalUrl(input: string): UnicalParseResult {
  const raw = (input || '').trim();
  if (!raw) return { ok: false, error: 'Paste a UniCal calendar link (or event id list).' };

  let eventParam: string | null = null;

  try {
    const maybeUrl = raw.includes('://') || raw.startsWith('unical.unibas.ch')
      ? new URL(raw.startsWith('http') ? raw : `https://${raw}`)
      : null;
    if (maybeUrl) {
      eventParam =
        maybeUrl.searchParams.get('e') ||
        maybeUrl.searchParams.get('eventIds') ||
        maybeUrl.searchParams.get('eventids');
    }
  } catch {
    // fall through to other shapes
  }

  if (!eventParam) {
    const queryMatch = raw.match(/[?&](?:e|eventIds|eventids)=([^&#]+)/i);
    if (queryMatch) {
      try {
        eventParam = decodeURIComponent(queryMatch[1]);
      } catch {
        eventParam = queryMatch[1];
      }
    }
  }

  if (!eventParam && /^[\d,\s%]+$/.test(raw)) {
    try {
      eventParam = decodeURIComponent(raw);
    } catch {
      eventParam = raw;
    }
  }

  if (!eventParam) {
    return {
      ok: false,
      error: 'No event ids found. Use a UniCal link that contains ?e=… (Calendar / Timetable / Downloads).',
    };
  }

  const parts = eventParam
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const eventIds: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return { ok: false, error: `Invalid event id “${part}”. Expected digits only.` };
    }
    const id = normalizeEventId(part);
    if (seen.has(id)) continue;
    seen.add(id);
    eventIds.push(id);
  }

  if (eventIds.length === 0) {
    return { ok: false, error: 'No event ids found in that link.' };
  }

  return { ok: true, eventIds, raw };
}

function lectureScore(course: Course): number {
  const title = (course.title || '').toLowerCase();
  const type = (course.type || '').toLowerCase();
  const note = (course.note || '').toLowerCase();
  let score = 0;
  if (type.includes('admission') || type.includes('foundation') || type.includes('elective')) score += 1;
  if (note.includes('practical') || title.includes('standardprogramm') || title.includes('übung')) score -= 2;
  if (title.includes('practical')) score -= 2;
  if ((course.cp ?? 0) >= 4) score += 1;
  return score;
}

/** Prefer a single lecture/main entry when several catalog rows share one VV id. */
export function pickPreferredCourse(candidates: Course[]): Course | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const ranked = [...candidates].sort((a, b) => {
    const scoreDiff = lectureScore(b) - lectureScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.cp ?? 0) - (a.cp ?? 0) || a.id.localeCompare(b.id);
  });
  const best = ranked[0];
  const second = ranked[1];
  if (lectureScore(best) === lectureScore(second) && (best.cp ?? 0) === (second.cp ?? 0)) {
    return null;
  }
  return best;
}

export function coursesByVvId(): Map<string, Course[]> {
  const map = new Map<string, Course[]>();
  for (const course of COURSES) {
    const vvId = extractVvIdFromCourseUrl(course.url);
    if (!vvId) continue;
    const list = map.get(vvId) || [];
    list.push(course as Course);
    map.set(vvId, list);
  }
  return map;
}

export function mapEventIdsToCourses(eventIds: string[]): UnicalMapResult {
  const byVv = coursesByVvId();
  const matched: Course[] = [];
  const unknownIds: string[] = [];
  const ambiguous: { vvId: string; candidates: Course[] }[] = [];
  const usedCourseIds = new Set<string>();

  for (const rawId of eventIds) {
    const vvId = normalizeEventId(rawId);
    const candidates = byVv.get(vvId) || [];
    if (candidates.length === 0) {
      unknownIds.push(vvId);
      continue;
    }
    const preferred = pickPreferredCourse(candidates);
    if (!preferred) {
      ambiguous.push({ vvId, candidates });
      continue;
    }
    if (usedCourseIds.has(preferred.id)) continue;
    usedCourseIds.add(preferred.id);
    matched.push(preferred);
  }

  return { matched, unknownIds, ambiguous };
}

export function germanDayToEnglish(day: string): string | null {
  const key = day.trim().toLowerCase();
  return DAY_DE_TO_EN[key] || null;
}

/**
 * Parse UniCal renderEventModal HTML for weekly patterns
 * (`wöchentlich` + day + time + first + last).
 */
export function parseUnicalEventModalHtml(html: string): UnicalResolvedSession[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&auml;/gi, 'ä')
    .replace(/&#x28;/gi, '(')
    .replace(/&#x29;/gi, ')')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  const schedule: UnicalResolvedSession[] = [];
  const re =
    /w(?:ö|oe)chentlich\s+(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const day = germanDayToEnglish(match[1]);
    const from = deDateToIso(match[4]);
    const until = deDateToIso(match[5]);
    if (!day || !from || !until) continue;
    const time = `${match[2].padStart(5, '0')} - ${match[3].padStart(5, '0')}`;
    // Room is not always adjacent in stripped text; leave empty for API merge to keep catalog room.
    schedule.push({ day, time, room: '', from, until });
  }
  return schedule;
}

/** Merge resolved from/until onto catalog sessions (match by day+time); keep catalog rooms. */
export function mergeResolvedSchedule(
  catalog: ScheduleSession[] | undefined,
  resolved: UnicalResolvedSession[],
): ScheduleSession[] {
  const base = (catalog || []).map((s) => ({ ...s }));
  if (resolved.length === 0) return base;

  const normTime = (t: string) => t.replace(/\s*[-–—]\s*/g, '-').replace(/\s+/g, '');

  for (const res of resolved) {
    const hit = base.find(
      (s) => s.day === res.day && normTime(s.time) === normTime(res.time),
    );
    if (hit) {
      hit.from = res.from;
      hit.until = res.until;
      if (!hit.room && res.room) hit.room = res.room;
    } else {
      base.push({
        day: res.day,
        time: res.time,
        room: res.room || 'TBA',
        from: res.from,
        until: res.until,
      });
    }
  }
  return base;
}

export async function resolveUnicalEvents(
  eventIds: string[],
): Promise<{ events: UnicalResolvedEvent[]; error?: string; datesEnriched: boolean }> {
  try {
    const res = await fetch('/api/unical-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        events: [],
        datesEnriched: false,
        error: typeof body.error === 'string' ? body.error : `Resolve failed (${res.status})`,
      };
    }
    const data = await res.json();
    const events = Array.isArray(data.events) ? (data.events as UnicalResolvedEvent[]) : [];
    return { events, datesEnriched: events.some((e) => e.schedule?.length > 0) };
  } catch {
    return {
      events: [],
      datesEnriched: false,
      error: 'Could not reach UniCal resolve API — using catalog times without live date ranges.',
    };
  }
}

export function applyResolvedSchedules(
  courses: Course[],
  events: UnicalResolvedEvent[],
): Course[] {
  const byVv = new Map(events.map((e) => [normalizeEventId(e.vvId), e]));
  return courses.map((course) => {
    const vvId = extractVvIdFromCourseUrl(course.url);
    if (!vvId) return course;
    const resolved = byVv.get(vvId);
    if (!resolved?.schedule?.length) return course;
    return {
      ...course,
      schedule: mergeResolvedSchedule(course.schedule, resolved.schedule),
    };
  });
}
