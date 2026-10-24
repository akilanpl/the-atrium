export const ANCHORS = [
  "Grandfather clock",
  "Librarian desk",
  "Hollow book",
  "Marble statue",
  "Hidden compartment",
] as const;
export const OBJECTS = [
  { id: "book-east", x: 3, z: -7, anchor: -1 },
  { id: "book-eastmost", x: 6, z: -7, anchor: -1 },
  { id: "clock", x: -6, z: -5, anchor: 0 },
  { id: "desk", x: 5, z: -4, anchor: 1 },
  { id: "book", x: -5, z: 3, anchor: 2 },
  { id: "statue", x: 5, z: 3, anchor: 3 },
  { id: "compartment", x: 0, z: -7, anchor: 4 },
  { id: "trigger", x: -3, z: -7, anchor: -1 },
];
export const BLOCKS = [
  ...[-6, -3, 3, 6].map((x) => ({ x, z: -8, w: 2.7, d: 0.9 })),
  { x: -6, z: -5, w: 1.5, d: 1.2 },
  { x: 5, z: -4, w: 3, d: 1.5 },
  { x: -5, z: 3, w: 2, d: 1.5 },
  { x: 5, z: 3, w: 1.5, d: 1.5 },
];
export type Phase =
  "WAITING" | "PREPARATION" | "EXPLORATION" | "FINALE" | "FINISHED";
export interface Player {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  keys: string[];
  ready: boolean;
  room: string;
  connected: boolean;
  finishedAt: number;
  avatar: AvatarId;
  motion: Motion;
  speed: number;
  action: number;
}
export interface Snapshot {
  code: string;
  host: string;
  phase: Phase;
  deadline: number;
  round: number;
  players: Player[];
  clue: string;
  owner: string;
  open: boolean;
  winner: string;
  started: number;
  ended: number;
}

export const AVATARS = [
  {
    id: "soren",
    name: "Soren",
    description: "The cartographer · short hair & angular features",
  },
  {
    id: "mara",
    name: "Mara",
    description: "The archivist · bobbed hair & sculpted cheekbones",
  },
] as const;
export type AvatarId = (typeof AVATARS)[number]["id"];
export type Motion =
  "idle" | "start" | "walk" | "run" | "stop" | "turn" | "interact";
export const WALK_SPEED = 1.65;
export const RUN_SPEED = 3.8;
export function avatarId(value: unknown): AvatarId {
  return value === "mara" ? "mara" : "soren";
}
export function canOccupy(
  x: number,
  z: number,
  library: boolean,
  open: boolean,
  radius = 0.3,
) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (library) {
    if (Math.abs(x) > 8 || Math.abs(z) > 8) return false;
    if (!open && Math.abs(x) < 1.5 + radius && Math.abs(z + 7.8) < 0.5 + radius)
      return false;
    return !BLOCKS.some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + radius &&
        Math.abs(z - b.z) < b.d / 2 + radius,
    );
  }
  if (Math.hypot(x, z) > 12) return false;
  return ![
    { x: -2.9, z: 0, w: 0.6, d: 0.9 },
    { x: 2.9, z: 0, w: 0.6, d: 0.9 },
    { x: 0, z: -10, w: 3.6, d: 0.6 },
    { x: 0, z: 10, w: 3.6, d: 0.6 },
    { x: 10, z: 0, w: 0.6, d: 3.6 },
    { x: -10, z: 0, w: 0.6, d: 3.6 },
  ].some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + radius &&
      Math.abs(z - b.z) < b.d / 2 + radius,
  );
}
export function motionFor(speed: number, turn: number): Motion {
  return speed > 2.6
    ? "run"
    : speed > 0.12
      ? "walk"
      : Math.abs(turn) > 0.14
        ? "turn"
        : "idle";
}
/** Sweep small intervals so a delayed/forged move cannot tunnel through thin solids. */
export function canTravel(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  library: boolean,
  open: boolean,
) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / 0.15),
  );
  for (let i = 1; i <= steps; i++)
    if (
      !canOccupy(
        fromX + ((toX - fromX) * i) / steps,
        fromZ + ((toZ - fromZ) * i) / steps,
        library,
        open,
      )
    )
      return false;
  return true;
}
/** Flat gameplay floors plus the low, physical portal plinth. */
export function groundHeight(x: number, z: number, library: boolean) {
  return !library && Math.hypot(x, z) < 3.3 ? 0.18 : 0;
}
