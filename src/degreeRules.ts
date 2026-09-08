/**
 * Official Uni Basel MSc Data Science (2026) requirement targets.
 * Single source of truth for UI, Explorer, and validation.
 * Targets live in degree_rules.json (shared with validate_all.cjs).
 * Admission (Auflagen) is student-specific and overlaid at runtime.
 */
import { creditModule, type Course } from './types';
import rulesJson from '../degree_rules.json';

export type RuleKind = 'exact' | 'min';

export type BucketStatus = 'empty' | 'short' | 'met' | 'overshoot';

type RuleEntry = { target: number; kind: RuleKind; module?: string; configurable?: boolean; derived?: string };

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

export function withAdmissionTarget(admissionTarget: number) {
  const admission = Math.max(0, Math.round(admissionTarget));
  return {
    ...DEGREE_RULES,
    admission: { ...DEGREE_RULES.admission, target: admission },
    grandTotal: {
      ...DEGREE_RULES.grandTotal,
      target: DEGREE_RULES.mscTotal.target + admission,
    },
  };
}

export function statusFor(value: number, target: number, kind: RuleKind): BucketStatus {
  if (kind === 'exact' && target === 0 && value === 0) return 'met';
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

export function evaluatePlan(courses: Course[], admissionTarget = DEGREE_RULES.admission.target): {
  stats: DegreeStats;
  buckets: BucketEvaluation[];
  isComplete: boolean;
  issues: string[];
  rules: ReturnType<typeof withAdmissionTarget>;
} {
  const rules = withAdmissionTarget(admissionTarget);
  const stats = computeStats(courses);
  const defs: Array<{ key: keyof DegreeStats; label: string; target: number; kind: RuleKind }> = [
    { key: 'admission', label: 'Admission Req', target: rules.admission.target, kind: rules.admission.kind },
    { key: 'math', label: 'Math Found.', target: rules.math.target, kind: rules.math.kind },
    { key: 'ml', label: 'ML Found.', target: rules.ml.target, kind: rules.ml.kind },
    { key: 'systems', label: 'Systems Found.', target: rules.systems.target, kind: rules.systems.kind },
    { key: 'foundationsSum', label: 'Foundations Sum', target: rules.foundationsSum.target, kind: rules.foundationsSum.kind },
    { key: 'electives', label: 'Electives', target: rules.electives.target, kind: rules.electives.kind },
    { key: 'thesis', label: 'Thesis block', target: rules.thesis.target, kind: rules.thesis.kind },
    { key: 'mscTotal', label: 'MSc Total', target: rules.mscTotal.target, kind: rules.mscTotal.kind },
    { key: 'grandTotal', label: 'Grand Total', target: rules.grandTotal.target, kind: rules.grandTotal.kind },
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
    if (b.key === 'admission' && b.target === 0 && b.value === 0) continue;
    if (b.status === 'short') {
      issues.push(`${b.label}: ${b.value}/${b.target} (need ${b.target - b.value} more)`);
    } else if (b.status === 'overshoot') {
      issues.push(`${b.label}: ${b.value}/${b.target} (over by ${b.value - b.target})`);
    }
  }

  const isComplete = buckets.every((b) => b.ok);
  return { stats, buckets, isComplete, issues, rules };
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
