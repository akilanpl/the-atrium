import type { UniverseId } from "../../../packages/shared/src/universes.js";
export const ATMOSPHERES = {
  atrium: {
    sky: "#14232b",
    fog: "#253942",
    sun: "#ffe0b0",
    fill: "#a5c5d4",
    ground: "#483524",
    intensity: 2.2,
  },
  library: {
    sky: "#241d18",
    fog: "#49392b",
    sun: "#ffcf91",
    fill: "#bfc9b2",
    ground: "#483020",
    intensity: 2,
  },
  observatory: {
    sky: "#090f26",
    fog: "#192744",
    sun: "#b6c8ff",
    fill: "#8c9ddc",
    ground: "#25223c",
    intensity: 1.8,
  },
  sanctuary: {
    sky: "#10363e",
    fog: "#1b535c",
    sun: "#8fdfd7",
    fill: "#63c7c1",
    ground: "#183e40",
    intensity: 1.6,
  },
  forge: {
    sky: "#211a22",
    fog: "#3c3034",
    sun: "#ffd0a0",
    fill: "#b0b9d1",
    ground: "#442a21",
    intensity: 2.1,
  },
  manor: {
    sky: "#201923",
    fog: "#3c303e",
    sun: "#eec49d",
    fill: "#b1a8cb",
    ground: "#39252c",
    intensity: 1.7,
  },
  garden: {
    sky: "#496b79",
    fog: "#76959b",
    sun: "#ffe9c4",
    fill: "#c9e2df",
    ground: "#4a5d48",
    intensity: 2.5,
  },
} as const;
export function atmosphere(world: UniverseId | "") {
  return ATMOSPHERES[world || "atrium"];
}
export type BodyState = "ground" | "takeoff" | "air" | "land" | "swim";
export function bodyState(
  world: UniverseId | "",
  grounded: boolean,
  vy: number,
  wasGrounded: boolean,
): BodyState {
  if (world === "sanctuary") return "swim";
  if (!grounded) return vy > 0.3 ? "takeoff" : "air";
  return wasGrounded ? "ground" : "land";
}
export function observedSpeed(
  distance: number,
  dt: number,
  teleported: boolean,
) {
  return teleported || !Number.isFinite(dt) || dt <= 0
    ? 0
    : Math.min(8, Math.max(0, distance / dt));
}
export function transitionIdentity(
  epoch: string,
  owner: string,
  phase: string,
  round: number,
) {
  return `${epoch}:${owner}:${phase}:${round}`;
}
export function burstEnvelope(age: number, duration = 1.4) {
  return age < 0 || age >= duration ? 0 : Math.sin((Math.PI * age) / duration);
}
