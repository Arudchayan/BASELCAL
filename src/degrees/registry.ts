import type { DegreeManifest, ProgrammeId } from './types';
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
