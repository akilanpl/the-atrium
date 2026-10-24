export const GRAPHICS = {
  LOW: {
    dpr: 0.75,
    shadows: false,
    shadowSize: 512,
    particles: 45,
    far: 55,
    ibl: false,
  },
  MEDIUM: {
    dpr: 1.25,
    shadows: true,
    shadowSize: 1024,
    particles: 110,
    far: 75,
    ibl: true,
  },
  HIGH: {
    dpr: 1.75,
    shadows: true,
    shadowSize: 2048,
    particles: 220,
    far: 100,
    ibl: true,
  },
} as const;
export type Quality = keyof typeof GRAPHICS;
export function quality(value: unknown): Quality {
  return value === "LOW" || value === "HIGH" ? value : "MEDIUM";
}
export function saved(key: string, fallback: string) {
  try {
    return localStorage.getItem("atrium:" + key) || fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: string) {
  try {
    localStorage.setItem("atrium:" + key, value);
  } catch {
    /* Private browsing may disable persistence. */
  }
}
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
