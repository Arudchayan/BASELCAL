import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getManifest,
  listEnabledProgrammes,
} from './degrees/registry';
import type { DegreeManifest, ProgrammeId } from './degrees/types';
import {
  loadActiveProgrammeId,
  saveActiveProgrammeId,
} from './planStorage';

type ProgrammeContextValue = {
  programmeId: ProgrammeId;
  setProgrammeId: (programmeId: ProgrammeId) => void;
  manifest: DegreeManifest;
  enabledProgrammes: DegreeManifest[];
};

const ProgrammeContext = createContext<ProgrammeContextValue | null>(null);

export function ProgrammeProvider({ children }: { children: ReactNode }) {
  const [programmeId, setProgrammeIdState] = useState<ProgrammeId>(() =>
    loadActiveProgrammeId(),
  );
  const enabledProgrammes = useMemo(() => listEnabledProgrammes(), []);

  const setProgrammeId = useCallback((nextProgrammeId: ProgrammeId) => {
    saveActiveProgrammeId(nextProgrammeId);
    setProgrammeIdState(nextProgrammeId);
  }, []);

  const value = useMemo<ProgrammeContextValue>(
    () => ({
      programmeId,
      setProgrammeId,
      manifest: getManifest(programmeId),
      enabledProgrammes,
    }),
    [enabledProgrammes, programmeId, setProgrammeId],
  );

  return (
    <ProgrammeContext.Provider value={value}>
      {children}
    </ProgrammeContext.Provider>
  );
}

export function useProgramme(): ProgrammeContextValue {
  const context = useContext(ProgrammeContext);
  if (!context) {
    throw new Error('useProgramme must be used within ProgrammeProvider');
  }
  return context;
}
