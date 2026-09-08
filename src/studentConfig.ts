export type StudentHome = {
  label?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
};

export type StudentConfig = {
  admissionTarget?: number;
  admissionNote?: string;
  home?: StudentHome;
  seedPlan?: boolean;
  plan?: Record<string, unknown>;
  allocations?: Record<string, string>;
};

export const STUDENT_CONFIG: StudentConfig | null =
  typeof __STUDENT_CONFIG__ !== 'undefined' ? __STUDENT_CONFIG__ : null;

export const ADMISSION_STORAGE_KEY = 'basel-ds-admission-target';

export function clampAdmission(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function configuredAdmissionTarget(): number {
  return clampAdmission(STUDENT_CONFIG?.admissionTarget ?? 0);
}

export function readAdmissionTarget(): number {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ADMISSION_STORAGE_KEY);
      if (raw != null && raw !== '') {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return clampAdmission(parsed);
      }
    } catch {
      // private mode / blocked storage
    }
  }
  return configuredAdmissionTarget();
}

export function writeAdmissionTarget(value: number): boolean {
  try {
    localStorage.setItem(ADMISSION_STORAGE_KEY, String(clampAdmission(value)));
    return true;
  } catch {
    return false;
  }
}

export function configuredHome(): {
  lat: number;
  lng: number;
  address?: string;
  label?: string;
} | null {
  const home = STUDENT_CONFIG?.home;
  if (!home || typeof home.lat !== 'number' || typeof home.lng !== 'number') return null;
  if (!Number.isFinite(home.lat) || !Number.isFinite(home.lng)) return null;
  return {
    lat: home.lat,
    lng: home.lng,
    address: home.address || undefined,
    label: home.label || undefined,
  };
}
