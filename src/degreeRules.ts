import { DS_RULES } from './degrees/dataSciencePack';
import {
  evaluatePack,
  statusFor,
  sumModule,
  withAdmissionTarget as withPackAdmissionTarget,
  type BucketStatus,
} from './degrees/ruleEngine';
import type { RuleKind } from './degrees/types';
import type { Course } from './types';
import legacyRulesJson from '../degree_rules.json';

export type { BucketStatus, RuleKind };
export { statusFor, sumModule };

const legacyRules = legacyRulesJson as Record<string, { target: number }>;
if (import.meta.env.DEV) {
  for (const [key, rule] of Object.entries(DS_RULES)) {
    if (legacyRules[key]?.target !== rule.target) {
      throw new Error(`degree_rules.json target is out of sync for "${key}"`);
    }
  }
}

export const DEGREE_RULES = DS_RULES;

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
  return withPackAdmissionTarget(DEGREE_RULES, admissionTarget);
}

export function computeStats(courses: Course[]): DegreeStats {
  return evaluatePack(courses, DEGREE_RULES, DEGREE_RULES.admission.target).stats as DegreeStats;
}

export function evaluatePlan(courses: Course[], admissionTarget = DEGREE_RULES.admission.target): {
  stats: DegreeStats;
  buckets: BucketEvaluation[];
  isComplete: boolean;
  issues: string[];
  rules: ReturnType<typeof withAdmissionTarget>;
} {
  const result = evaluatePack(courses, DEGREE_RULES, admissionTarget);
  return {
    ...result,
    stats: result.stats as DegreeStats,
    buckets: result.buckets as BucketEvaluation[],
  };
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
