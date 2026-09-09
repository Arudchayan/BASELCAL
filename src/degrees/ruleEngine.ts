import { creditModule, type Course } from '../types';
import type { PackRuleEntry, RuleKind } from './types';

export type PackRules = Record<string, PackRuleEntry>;
export type PackStats = Record<string, number>;
export type BucketStatus = 'empty' | 'short' | 'met' | 'overshoot';

export type BucketEvaluation = {
  key: string;
  label: string;
  value: number;
  target: number;
  kind: RuleKind;
  status: BucketStatus;
  ok: boolean;
};

const BUCKET_ORDER = [
  'admission',
  'math',
  'ml',
  'systems',
  'foundationsSum',
  'electives',
  'thesis',
  'mscTotal',
  'grandTotal',
] as const;

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
  return courses
    .filter((course) => creditModule(course) === moduleName)
    .reduce((total, course) => total + course.cp, 0);
}

export function withAdmissionTarget<Rules extends PackRules>(
  rules: Rules,
  admissionTarget: number,
): Rules {
  const admission = Math.max(0, Math.round(admissionTarget));
  const adjusted = Object.fromEntries(
    Object.entries(rules).map(([key, rule]) => {
      if (key === 'admission' && rule.configurable) {
        return [key, { ...rule, target: admission }];
      }
      if (rule.derived === 'mscPlusAdmission') {
        return [key, { ...rule, target: rules.mscTotal.target + admission }];
      }
      return [key, { ...rule }];
    }),
  );
  return adjusted as Rules;
}

function orderedRuleKeys(rules: PackRules): string[] {
  const preferred = BUCKET_ORDER.filter((key) => key in rules);
  const remaining = Object.keys(rules).filter(
    (key) => !BUCKET_ORDER.includes(key as (typeof BUCKET_ORDER)[number]),
  );
  return [...preferred, ...remaining];
}

export function evaluatePack<Rules extends PackRules>(
  courses: Course[],
  packRules: Rules,
  admissionTarget: number,
): {
  stats: PackStats;
  buckets: BucketEvaluation[];
  isComplete: boolean;
  issues: string[];
  rules: Rules;
} {
  const rules = withAdmissionTarget(packRules, admissionTarget);
  const stats: PackStats = {};

  for (const [key, rule] of Object.entries(rules)) {
    if (rule.module) stats[key] = sumModule(courses, rule.module);
  }
  for (const [key, rule] of Object.entries(rules)) {
    if (rule.sumOf) {
      stats[key] = rule.sumOf.reduce((total, sourceKey) => total + (stats[sourceKey] ?? 0), 0);
    }
  }
  if ('mscTotal' in rules) {
    stats.mscTotal = courses
      .filter((course) => course.type !== 'Admission')
      .reduce((total, course) => total + course.cp, 0);
  }
  if ('grandTotal' in rules) {
    stats.grandTotal = courses.reduce((total, course) => total + course.cp, 0);
  }

  const buckets = orderedRuleKeys(rules).map((key) => {
    const rule = rules[key];
    const value = stats[key] ?? 0;
    const status = statusFor(value, rule.target, rule.kind);
    return {
      key,
      label: rule.label,
      value,
      target: rule.target,
      kind: rule.kind,
      status,
      ok: status === 'met',
    };
  });

  const issues: string[] = [];
  for (const bucket of buckets) {
    if (bucket.key === 'admission' && bucket.target === 0 && bucket.value === 0) continue;
    if (bucket.status === 'short') {
      issues.push(
        `${bucket.label}: ${bucket.value}/${bucket.target} (need ${bucket.target - bucket.value} more)`,
      );
    } else if (bucket.status === 'overshoot') {
      issues.push(
        `${bucket.label}: ${bucket.value}/${bucket.target} (over by ${bucket.value - bucket.target})`,
      );
    }
  }

  return {
    stats,
    buckets,
    isComplete: buckets.every((bucket) => bucket.ok),
    issues,
    rules,
  };
}
