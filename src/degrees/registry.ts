import type { DegreeManifest, ProgrammeId } from './types';
import type { PackRules } from './ruleEngine';
import { DS_RULES } from './dataSciencePack';
import dataScienceManifest from '../../degrees/data-science/manifest.json';
import computerScienceManifest from '../../degrees/computer-science/manifest.json';
import mathematicsManifest from '../../degrees/mathematics/manifest.json';

export const DEFAULT_PROGRAMME_ID: ProgrammeId = 'data-science';

const PROGRAMME_ORDER: ProgrammeId[] = ['data-science', 'computer-science', 'mathematics'];

const MANIFESTS: Record<ProgrammeId, DegreeManifest> = {
  'data-science': dataScienceManifest as DegreeManifest,
  'computer-science': computerScienceManifest as DegreeManifest,
  mathematics: mathematicsManifest as DegreeManifest,
};

export function listProgrammes(): DegreeManifest[] {
  return PROGRAMME_ORDER.map((id) => MANIFESTS[id]);
}

export function getManifest(id: ProgrammeId): DegreeManifest {
  return MANIFESTS[id];
}

export function listEnabledProgrammes(): DegreeManifest[] {
  return listProgrammes().filter((p) => p.enabled);
}

export function getPackRules(id: ProgrammeId): PackRules {
  switch (id) {
    case 'data-science':
      return DS_RULES;
    case 'computer-science':
    case 'mathematics':
      throw new Error(`Pack rules not yet available for "${id}"`);
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
