import type { ScheduleSession } from './types';

export function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** `dd.mm.yyyy` → `yyyy-mm-dd` */
export function deDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  return parseIsoDate(iso) ? iso : null;
}

export function mondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when the Monday–Sunday week overlaps the session’s [from, until] (inclusive). Missing bounds = always on. */
export function sessionActiveInWeek(session: ScheduleSession, weekMonday: Date): boolean {
  const weekEnd = addDays(weekMonday, 6);
  const from = parseIsoDate(session.from);
  const until = parseIsoDate(session.until);
  if (from && weekEnd < from) return false;
  if (until && weekMonday > until) return false;
  return true;
}
