import type { Course, SemesterId } from './types';

export type OfferingSeason = 'fall' | 'spring' | 'both' | 'irregular' | 'contract' | 'unknown';

export type OfferingMeta = {
  season: OfferingSeason;
  biennial: boolean;
  annual: boolean;
  raw: string;
};

export const SEMESTER_SEASONS: Record<SemesterId, 'fall' | 'spring'> = {
  s1: 'fall',
  s2: 'spring',
  s3: 'fall',
  s4: 'spring',
};

export function parseOffering(when: string | undefined): OfferingMeta {
  const raw = when || '';
  const lower = raw.toLowerCase();
  const biennial = /every\s*2nd|biennial|every second/i.test(lower);
  const annual = /annual|jahreskurs|starts in fall/i.test(lower);

  if (/learning\s*contract/i.test(lower)) {
    return { season: 'contract', biennial: false, annual: false, raw };
  }
  if (/irregular/i.test(lower)) {
    return { season: 'irregular', biennial, annual: false, raw };
  }

  const hasFall = /\bfall\b/.test(lower);
  const hasSpring = /\bspring\b/.test(lower);

  if (annual && hasFall && !hasSpring) {
    // Jahreskurs: starts fall, continues spring — halves must still respect semester
    return { season: 'both', biennial: false, annual: true, raw };
  }
  if (hasFall && hasSpring) {
    return { season: 'both', biennial, annual, raw };
  }
  if (hasFall) {
    return { season: 'fall', biennial, annual, raw };
  }
  if (hasSpring) {
    return { season: 'spring', biennial, annual, raw };
  }
  return { season: 'unknown', biennial, annual, raw };
}

export type PlacementWarning = {
  level: 'error' | 'warn' | 'info';
  message: string;
};

/** Analysis I half → Fall; Analysis II half → Spring */
function annualHalfWarning(course: Course, semSeason: 'fall' | 'spring'): PlacementWarning | null {
  const title = (course.title || '').toLowerCase();
  const id = course.id || '';
  if (id.endsWith('-1') || /\banalysis i\b/.test(title)) {
    if (semSeason === 'spring') {
      return { level: 'error', message: 'Analysis I half belongs in a Fall semester.' };
    }
  }
  if (id.endsWith('-2') || /\banalysis ii\b/.test(title)) {
    if (semSeason === 'fall') {
      return { level: 'error', message: 'Analysis II half belongs in a Spring semester.' };
    }
  }
  return null;
}

export function getPlacementWarnings(course: Course, semesterId: SemesterId): PlacementWarning[] {
  const warnings: PlacementWarning[] = [];
  const semSeason = SEMESTER_SEASONS[semesterId];
  const meta = parseOffering(course.when);

  const half = annualHalfWarning(course, semSeason);
  if (half) warnings.push(half);

  switch (meta.season) {
    case 'fall':
      if (semSeason === 'spring') {
        warnings.push({ level: 'error', message: 'Usually only offered in Fall semesters!' });
      }
      break;
    case 'spring':
      if (semSeason === 'fall') {
        warnings.push({ level: 'error', message: 'Usually only offered in Spring semesters!' });
      }
      break;
    case 'irregular':
      warnings.push({
        level: 'warn',
        message: 'Irregular offering — verify it runs in this academic year.',
      });
      break;
    case 'contract':
      warnings.push({
        level: 'info',
        message: 'Learning contract — no fixed lecture schedule (remote-friendly).',
      });
      break;
    case 'both':
    case 'unknown':
      break;
    default: {
      const _exhaustive: never = meta.season;
      void _exhaustive;
      break;
    }
  }

  if (meta.biennial) {
    warnings.push({
      level: 'warn',
      message: 'Biennial (every 2nd semester cycle) — confirm it is offered this year.',
    });
  }

  return warnings;
}

export function primaryMismatchMessage(course: Course, semesterId: SemesterId): string | null {
  const warnings = getPlacementWarnings(course, semesterId);
  const err = warnings.find((w) => w.level === 'error');
  if (err) return err.message;
  const warn = warnings.find((w) => w.level === 'warn');
  if (warn) return warn.message;
  return null;
}
