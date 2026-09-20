import { useReducedMotion } from 'framer-motion';

/** Shared Framer motion timings that collapse to instant when the user prefers reduced motion. */
export function useMotionPrefs() {
  const reduceMotion = useReducedMotion();
  return {
    reduceMotion: !!reduceMotion,
    fade: reduceMotion ? { duration: 0 } : { duration: 0.2 },
    fadeFast: reduceMotion ? { duration: 0 } : { duration: 0.15 },
    slide: reduceMotion
      ? { duration: 0 }
      : { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
    spring: reduceMotion
      ? { type: 'tween' as const, duration: 0 }
      : { type: 'spring' as const, damping: 25, stiffness: 300 },
    y: (distance: number) => (reduceMotion ? 0 : distance),
    scale: (value: number) => (reduceMotion ? 1 : value),
  };
}
