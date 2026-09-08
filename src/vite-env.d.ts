/// <reference types="vite/client" />

type StudentConfigHome = {
  label?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
};

type StudentConfigShape = {
  admissionTarget?: number;
  admissionNote?: string;
  home?: StudentConfigHome;
  seedPlan?: boolean;
  plan?: Record<string, unknown>;
  allocations?: Record<string, string>;
};

declare const __STUDENT_CONFIG__: StudentConfigShape | null;
