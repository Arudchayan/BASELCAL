export type ProgrammeId = 'data-science' | 'computer-science' | 'mathematics';

export type RuleKind = 'exact' | 'min';

export type PackRuleEntry = {
  target: number;
  kind: RuleKind;
  module?: string;
  configurable?: boolean;
  derived?: string;
  label: string;
  sumOf?: string[];
};

export type DegreeManifest = {
  id: ProgrammeId;
  displayName: string;
  shortName: string;
  degreeTitle: string;
  totalCp: number;
  enabled: boolean;
  brandSubtitle: string;
  sources: { rules: string; vvProgrammeLabel: string };
};
