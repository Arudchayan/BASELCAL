import rulesJson from '../../degrees/data-science/rules.json';
import type { PackRuleEntry } from './types';

export type DataScienceRuleKey =
  | 'admission'
  | 'math'
  | 'ml'
  | 'systems'
  | 'foundationsSum'
  | 'electives'
  | 'thesis'
  | 'mscTotal'
  | 'grandTotal';

export type DataScienceRules = Record<DataScienceRuleKey, PackRuleEntry> & {
  admission: PackRuleEntry & { module: string };
  math: PackRuleEntry & { module: string };
  ml: PackRuleEntry & { module: string };
  systems: PackRuleEntry & { module: string };
  electives: PackRuleEntry & { module: string };
  thesis: PackRuleEntry & { module: string };
};

export const DS_RULES = rulesJson as DataScienceRules;
