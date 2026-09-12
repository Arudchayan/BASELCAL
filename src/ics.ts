import type { PlanState, SemesterId } from './types';
import { SEMESTER_IDS } from './types';

const DAY_TO_VEVENT: Record<string, string> = {
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
  Sunday: 'SU',
};

type Range = { start: Date; until: Date };

const TZID = 'Europe/Zurich';

/** Europe/Zurich DST rules (CEST last Sun Mar → CET last Sun Oct). */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Official University of Basel teaching periods for this Fall 2026 cohort. */
const SEMESTER_RANGES: Record<SemesterId, Range> = {
  s1: { start: new Date(2026, 8, 14), until: new Date(2026, 11, 18) },
  s2: { start: new Date(2027, 1, 22), until: new Date(2027, 5, 4) },
  s3: { start: new Date(2027, 8, 20), until: new Date(2027, 11, 23) },
  s4: { start: new Date(2028, 1, 21), until: new Date(2028, 5, 2) },
};

function semesterRange(sem: SemesterId): Range {
  return SEMESTER_RANGES[sem];
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function icsStampUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function icsDate(d: Date, hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Number(h))}${pad(Number(m))}00`;
}

function parseTime(time: string): { from: string; to: string } | null {
  const match = time.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { from: `${pad(Number(match[1]))}:${match[2]}`, to: `${pad(Number(match[3]))}:${match[4]}` };
}

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function firstDateOnDay(from: Date, day: string): Date | null {
  const target = DAY_INDEX[day];
  if (target === undefined) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7));
  return d;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildIcs(plan: PlanState, disclaimer: string, sems: SemesterId[] = SEMESTER_IDS): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UniBasel DS Planner//Curriculum Planner//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:UniBasel DS Planner`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
  ];
  const uidSeen = new Map<string, number>();

  for (const sem of sems) {
    const courses = plan[sem];
    if (courses.length === 0) continue;
    const { start, until } = semesterRange(sem);

    for (const course of courses) {
      if (!course.schedule) continue;
      for (const session of course.schedule) {
        const times = parseTime(session.time);
        const byDay = DAY_TO_VEVENT[session.day];
        if (!times || !byDay) continue;
        const first = firstDateOnDay(start, session.day);
        if (!first) continue;
        const uidKey = `${course.id}-${byDay}-${times.from.replace(':', '')}-${times.to.replace(':', '')}`;
        const occurrence = (uidSeen.get(uidKey) ?? 0) + 1;
        uidSeen.set(uidKey, occurrence);
        const summary = course.code === 'Learning contract' ? course.title : `${course.code} — ${course.title}`;
        lines.push(
          'BEGIN:VEVENT',
          `UID:baselcal-${uidKey}${occurrence > 1 ? `-${occurrence}` : ''}@baselcal.local`,
          `DTSTAMP:${icsStampUTC(now)}`,
          `DTSTART;TZID=${TZID}:${icsDate(first, times.from)}`,
          `DTEND;TZID=${TZID}:${icsDate(first, times.to)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${icsDate(until, '23:59')}`,
          'SEQUENCE:0',
          `SUMMARY:${icsEscape(summary)}`,
          `LOCATION:${icsEscape(session.room || '')}`,
          `DESCRIPTION:${icsEscape(`${course.code} · ${course.cp} CP · ${sem.toUpperCase()} · ${course.module}\n${disclaimer}`)}`,
          'BEGIN:VALARM',
          'TRIGGER:-PT10M',
          'ACTION:DISPLAY',
          `DESCRIPTION:${icsEscape(summary)}`,
          'END:VALARM',
          'END:VEVENT',
        );
      }
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(plan: PlanState, disclaimer: string, programmeId = 'plan', sems?: SemesterId[]): void {
  const blob = new Blob([buildIcs(plan, disclaimer, sems ?? SEMESTER_IDS)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const scope = sems && sems.length === 1 ? `-${sems[0]}` : '';
  a.download = `baselcal-${programmeId}-timetable${scope}-${new Date().toISOString().slice(0, 10)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
