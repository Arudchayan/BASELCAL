/**
 * Official Uni Basel MSc Data Science (2026) requirement targets.
 * Single source of truth for UI, Explorer, and validation.
 * Targets live in degree_rules.json (shared with validate_all.cjs).
 */
import { creditModule, type Course } from './types';
import rulesJson from '../degree_rules.json';

export type RuleKind = 'exact' | 'min';

export type BucketStatus = 'empty' | 'short' | 'met' | 'overshoot';

type RuleEntry = { target: number; kind: RuleKind; module?: string };

export const DEGREE_RULES = rulesJson as {
  admission: RuleEntry & { module: string };
  math: RuleEntry & { module: string };
  ml: RuleEntry & { module: string };
  systems: RuleEntry & { module: string };
  foundationsSum: RuleEntry;
  electives: RuleEntry & { module: string };
  thesis: RuleEntry & { module: string };
  mscTotal: RuleEntry;
  grandTotal: RuleEntry;
};

export type DegreeStats = {
  admission: number;
  math: number;
  ml: number;
  systems: number;
  foundationsSum: number;
  electives: number;
  thesis: number;
  mscTotal: number;
  grandTotal: number;
};

export type BucketEvaluation = {
  key: keyof DegreeStats;
  label: string;
  value: number;
  target: number;
  kind: RuleKind;
  status: BucketStatus;
  ok: boolean;
};

export function statusFor(value: number, target: number, kind: RuleKind): BucketStatus {
  if (value === 0) return 'empty';
  if (kind === 'exact') {
    if (value < target) return 'short';
    if (value > target) return 'overshoot';
    return 'met';
  }
  if (value < target) return 'short';
  return 'met';
}

export function sumModule(courses: Course[], moduleName: string): number {
  return courses.filter((c) => creditModule(c) === moduleName).reduce((acc, c) => acc + c.cp, 0);
}

export function computeStats(courses: Course[]): DegreeStats {
  const admission = sumModule(courses, DEGREE_RULES.admission.module);
  const math = sumModule(courses, DEGREE_RULES.math.module);
  const ml = sumModule(courses, DEGREE_RULES.ml.module);
  const systems = sumModule(courses, DEGREE_RULES.systems.module);
  const electives = sumModule(courses, DEGREE_RULES.electives.module);
  const thesis = sumModule(courses, DEGREE_RULES.thesis.module);
  const foundationsSum = math + ml + systems;
  const mscTotal = courses.filter((c) => c.type !== 'Admission').reduce((acc, c) => acc + c.cp, 0);
  const grandTotal = courses.reduce((acc, c) => acc + c.cp, 0);
  return { admission, math, ml, systems, foundationsSum, electives, thesis, mscTotal, grandTotal };
}

export function evaluatePlan(courses: Course[]): {
  stats: DegreeStats;
  buckets: BucketEvaluation[];
  isComplete: boolean;
  issues: string[];
} {
  const stats = computeStats(courses);
  const defs: Array<{ key: keyof DegreeStats; label: string; target: number; kind: RuleKind }> = [
    { key: 'admission', label: 'Admission Req', target: DEGREE_RULES.admission.target, kind: DEGREE_RULES.admission.kind },
    { key: 'math', label: 'Math Found.', target: DEGREE_RULES.math.target, kind: DEGREE_RULES.math.kind },
    { key: 'ml', label: 'ML Found.', target: DEGREE_RULES.ml.target, kind: DEGREE_RULES.ml.kind },
    { key: 'systems', label: 'Systems Found.', target: DEGREE_RULES.systems.target, kind: DEGREE_RULES.systems.kind },
    { key: 'foundationsSum', label: 'Foundations Sum', target: DEGREE_RULES.foundationsSum.target, kind: DEGREE_RULES.foundationsSum.kind },
    { key: 'electives', label: 'Electives', target: DEGREE_RULES.electives.target, kind: DEGREE_RULES.electives.kind },
    { key: 'thesis', label: 'Thesis block', target: DEGREE_RULES.thesis.target, kind: DEGREE_RULES.thesis.kind },
    { key: 'mscTotal', label: 'MSc Total', target: DEGREE_RULES.mscTotal.target, kind: DEGREE_RULES.mscTotal.kind },
    { key: 'grandTotal', label: 'Grand Total', target: DEGREE_RULES.grandTotal.target, kind: DEGREE_RULES.grandTotal.kind },
  ];

  const buckets = defs.map((d) => {
    const value = stats[d.key];
    const st = statusFor(value, d.target, d.kind);
    return {
      key: d.key,
      label: d.label,
      value,
      target: d.target,
      kind: d.kind,
      status: st,
      ok: st === 'met',
    };
  });

  const issues: string[] = [];
  for (const b of buckets) {
    if (b.status === 'short') {
      issues.push(`${b.label}: ${b.value}/${b.target} (need ${b.target - b.value} more)`);
    } else if (b.status === 'overshoot') {
      issues.push(`${b.label}: ${b.value}/${b.target} (over by ${b.value - b.target})`);
    }
  }

  const isComplete = buckets.every((b) => b.ok);
  return { stats, buckets, isComplete, issues };
}

export function statusColor(status: BucketStatus, accent: string): string {
  switch (status) {
    case 'met':
      return accent;
    case 'short':
      return '#d97706';
    case 'overshoot':
      return '#ef4444';
    case 'empty':
      return 'var(--text-muted)';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
