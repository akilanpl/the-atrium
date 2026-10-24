export const MIN_PLAYERS = 2,
  MAX_PLAYERS = 6,
  MAX_UNIVERSES = 6;
export const CUSTOMIZATION = { props: 3, decoys: 2, variants: 2 };
export type UniverseId =
  "library" | "observatory" | "sanctuary" | "forge" | "manor" | "garden";
export interface Point {
  x: number;
  y: number;
  z: number;
}
export interface Solid extends Point {
  w: number;
  h: number;
  d: number;
  id: string;
}
export interface Interactable extends Point {
  id: string;
  name: string;
  anchor: number;
  action?: string;
}
export interface UniverseDefinition {
  id: UniverseId;
  name: string;
  theme: string;
  color: string;
  spawn: Point;
  bounds: { x: number; z: number; height: number };
  physics: { gravity: number; jump: number; drag: number; swim: boolean };
  anchors: Interactable[];
  mechanisms: Interactable[];
  solids: Solid[];
  hint: string;
}
const anchor = (
  id: string,
  name: string,
  x: number,
  z: number,
  index: number,
  y = 0,
): Interactable => ({ id, name, x, y, z, anchor: index });
const lever = (
  id: string,
  name: string,
  x: number,
  z: number,
  action: string,
): Interactable => ({ id, name, x, y: 0, z, anchor: -1, action });
const common = {
  spawn: { x: 0, y: 0, z: 6 },
  bounds: { x: 8, z: 8, height: 10 },
  physics: { gravity: 14, jump: 6.5, drag: 10, swim: false },
};
export const UNIVERSES: UniverseDefinition[] = [
  {
    ...common,
    id: "library",
    name: "Clockwork Library",
    theme: "Kinematic machinery",
    color: "#d7b16d",
    anchors: [
      anchor("clock", "Grandfather clock", -6, -5, 0),
      anchor("desk", "Librarian desk", 5, -4, 1),
      anchor("book", "Hollow atlas", -5, 3, 2),
      anchor("statue", "Marble statue", 5, 3, 3),
      anchor("compartment", "Hidden compartment", 0, -7, 4),
    ],
    mechanisms: [
      lever("trigger", "Pull the unfinished volume", -3, -7, "switch"),
      lever("brake", "Stop / release the clock escapement", -3, -4, "brake"),
    ],
    solids: [
      ...[-6, -3, 3, 6].map((x) => ({
        id: "shelf" + x,
        x,
        y: 0,
        z: -8,
        w: 2.7,
        h: 5,
        d: 0.9,
      })),
      { id: "clock", x: -6, y: 0, z: -5, w: 1.5, h: 3, d: 1.2 },
      { id: "desk", x: 5, y: 0, z: -4, w: 3, h: 1.2, d: 1.5 },
      { id: "book", x: -5, y: 0, z: 3, w: 2, h: 1.1, d: 1.5 },
      { id: "statue", x: 5, y: 0, z: 3, w: 1.5, h: 3, d: 1.5 },
    ],
    hint: "Pull the unfinished volume, then stop the escapement or wait for the passage.",
  },
  {
    ...common,
    id: "observatory",
    name: "Astral Observatory",
    theme: "Low gravity and celestial traversal",
    color: "#ada9ff",
    bounds: { x: 9, z: 9, height: 14 },
    physics: { gravity: 3.2, jump: 6, drag: 5, swim: false },
    anchors: [
      anchor("astrolabe", "Brass astrolabe", -5, 3, 0),
      anchor("chart", "Celestial chart", 5, 3, 1),
      anchor("moon", "Moon terrace", 3, -1, 2, 1.5),
      anchor("telescope", "Telescope balcony", 3, -5, 3, 3),
      anchor("zenith", "Zenith reliquary", -3, -5, 4, 4.5),
    ],
    mechanisms: [lever("orrery", "Align the orrery", 0, 0, "switch")],
    solids: [
      { id: "moon-platform", x: 3, y: 0, z: -1, w: 3, h: 1.5, d: 3 },
      { id: "telescope-platform", x: 3, y: 0, z: -5, w: 3, h: 3, d: 3 },
      { id: "zenith-platform", x: -3, y: 0, z: -5, w: 3, h: 4.5, d: 3 },
    ],
    hint: "Align the orrery. Space gives a high low-gravity jump; steer in the air toward the terraces.",
  },
  {
    ...common,
    id: "sanctuary",
    name: "Sunken Sanctuary",
    theme: "Buoyancy, drag and redirected currents",
    color: "#6de0cf",
    bounds: { x: 8, z: 9, height: 8 },
    physics: { gravity: 0, jump: 0, drag: 2.5, swim: true },
    anchors: [
      anchor("shell", "Pearl alcove", -5, 3, 0, 1),
      anchor("amphora", "Sunken amphora", 5, 3, 1),
      anchor("coral", "Coral balcony", -5, -3, 2, 3),
      anchor("obelisk", "Drowned obelisk", 5, -4, 3, 4),
      anchor("relic", "Current-sealed reliquary", 0, -6, 4, 3),
    ],
    mechanisms: [lever("valve", "Redirect the current", 0, 1, "switch")],
    solids: [
      { id: "reef-left", x: -7, y: 0, z: -3, w: 1, h: 4, d: 3 },
      { id: "reef-right", x: 7, y: 0, z: -4, w: 1, h: 5, d: 3 },
    ],
    hint: "Space ascends, C descends. Redirect the current and let the buoyant seal drift onto the right-hand catch.",
  },
  {
    ...common,
    id: "forge",
    name: "Polarity Forge",
    theme: "Magnetic forces and constrained machinery",
    color: "#ff9b69",
    bounds: { x: 9, z: 8, height: 9 },
    anchors: [
      anchor("anvil", "Runic anvil", -5, 3, 0),
      anchor("bellows", "Ancient bellows", 5, 3, 1),
      anchor("coil", "Induction coil", -5, -5, 2),
      anchor("conductor", "Conductor cabinet", 5, -5, 3),
      anchor("vault", "Magnetic vault", 0, -6, 4),
    ],
    mechanisms: [
      lever("polarity", "Reverse magnetic polarity", 0, 2, "switch"),
    ],
    solids: [
      { id: "furnace", x: -7, y: 0, z: -1, w: 2, h: 4, d: 3 },
      { id: "press", x: 7, y: 0, z: -1, w: 2, h: 4, d: 3 },
    ],
    hint: "Reverse polarity. Attraction pulls the metal carriage to the left conductor; repulsion sends it right.",
  },
  {
    ...common,
    id: "manor",
    name: "Shifting Manor",
    theme: "Moving architecture and collision",
    color: "#d39cb8",
    bounds: { x: 8, z: 9, height: 8 },
    anchors: [
      anchor("portrait-cache", "Portrait cache", -5, 4, 0),
      anchor("music", "Music cabinet", 5, 4, 1),
      anchor("hearth", "Cold hearth", -5, -5, 2),
      anchor("mirror", "Silver mirror", 5, -5, 3),
      anchor("chamber", "Hidden chamber", 0, -7, 4),
    ],
    mechanisms: [
      lever("portrait", "Turn the watchful portrait", -4, 0, "switch"),
      lever("candelabra", "Lower the candelabra", 4, 0, "second"),
    ],
    solids: [
      { id: "partition-left", x: -6, y: 0, z: -1.5, w: 3, h: 3, d: 0.5 },
      { id: "partition-right", x: 6, y: 0, z: -1.5, w: 3, h: 3, d: 0.5 },
    ],
    hint: "Turn the portrait and lower the candelabra. Wait for the sliding corridor to align; a wall waits rather than crushing you.",
  },
  {
    ...common,
    id: "garden",
    name: "Tempest Garden",
    theme: "Wind, momentum and a moving sky platform",
    color: "#96d7a8",
    bounds: { x: 9, z: 9, height: 10 },
    physics: { gravity: 10, jump: 6, drag: 4, swim: false },
    anchors: [
      anchor("root", "Ancient tree hollow", -5, 3, 0),
      anchor("fountain", "Rain fountain", 5, 3, 1),
      anchor("windchime", "Windchime altar", -5, -4, 2),
      anchor("seed", "Storm seed", 5, -4, 3),
      anchor("aerie", "Turbine aerie", 0, -6, 4, 1.2),
    ],
    mechanisms: [lever("vane", "Redirect the wind vane", 0, 1, "switch")],
    solids: [{ id: "aerie-platform", x: 0, y: 0, z: -6, w: 3, h: 1.2, d: 2 }],
    hint: "Redirect the vane to spin the turbine. Gusts push you sideways; jump onto the raised aerie when it is powered.",
  },
];
export const universe = (id: UniverseId | string) =>
  UNIVERSES.find((u) => u.id === id) || UNIVERSES[0];
export const door = (id: UniverseId) => {
  const i = UNIVERSES.findIndex((u) => u.id === id),
    a = (Math.PI * 2 * i) / MAX_UNIVERSES;
  return { x: Math.sin(a) * 10, y: 0, z: -Math.cos(a) * 10, angle: a };
};
export const objects = (id: UniverseId) => [
  ...universe(id).anchors,
  ...universe(id).mechanisms,
];
export function shuffledUniverses(seed: number) {
  const a = UNIVERSES.map((u) => u.id);
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export interface MechanismState {
  stage: number;
  frozen: boolean;
  clock: number;
  crate: number;
  velocity: number;
  wall: number;
  turbine: number;
  platform: number;
  elapsed: number;
}
export const freshMechanism = (variant = 0): MechanismState => ({
  stage: variant,
  frozen: false,
  clock: 0,
  crate: variant ? 3 : -1,
  velocity: 0,
  wall: -3,
  turbine: 0,
  platform: 0,
  elapsed: 0,
});
export function mechanismSolved(id: UniverseId, s: MechanismState) {
  switch (id) {
    case "library":
      return s.stage > 0 && (s.frozen || s.clock > 0);
    case "observatory":
      return s.stage > 0;
    case "sanctuary":
      return s.crate > 3;
    case "forge":
      return s.crate < -3;
    case "manor":
      return s.stage === 3 && s.wall > 2.5;
    case "garden":
      return s.turbine > 0.8;
  }
}
export function mechanismSolids(id: UniverseId, s: MechanismState): Solid[] {
  const out = [...universe(id).solids];
  if (id === "library" && !mechanismSolved(id, s))
    out.push({ id: "secret-shelf", x: 0, y: 0, z: -7.8, w: 3, h: 4, d: 0.7 });
  if (id === "forge")
    out.push({
      id: "carriage",
      x: s.crate,
      y: 0,
      z: -2,
      w: 1.8,
      h: 1.8,
      d: 1.8,
    });
  if (id === "manor")
    out.push({
      id: "sliding-wall",
      x: s.wall,
      y: 0,
      z: -2.8,
      w: 3,
      h: 3,
      d: 0.5,
    });
  if (id === "garden")
    out.push({
      id: "wind-platform",
      x: s.platform,
      y: 0,
      z: -2,
      w: 2,
      h: 0.7,
      d: 2,
    });
  return out;
}
export const overlap = (p: Point, b: Solid) =>
  Math.abs(p.x - b.x) < b.w / 2 + 0.3 &&
  Math.abs(p.z - b.z) < b.d / 2 + 0.3 &&
  p.y < b.y + b.h - 0.01 &&
  p.y + 1.65 > b.y + 0.01;
export function stepMechanism(
  id: UniverseId,
  s: MechanismState,
  dt: number,
  players: Point[] = [],
) {
  s.elapsed += dt;
  if (!s.frozen) {
    const next = Math.sin(s.elapsed * 1.2) > 0.1 ? 1 : 0;
    s.clock =
      id === "library" &&
      s.stage &&
      next === 0 &&
      players.some((p) =>
        overlap(p, {
          id: "secret-shelf",
          x: 0,
          y: 0,
          z: -7.8,
          w: 3,
          h: 4,
          d: 0.7,
        }),
      )
        ? 1
        : next;
  }
  if (id === "forge" || id === "sanctuary") {
    const target = id === "forge" ? (s.stage ? -4 : 4) : s.stage ? 4 : -4;
    const accel =
      (target - s.crate) * (id === "forge" ? 4 : 1.5) -
      s.velocity * (id === "forge" ? 3 : 2);
    s.velocity = Math.max(-3, Math.min(3, s.velocity + accel * dt));
    const next = Math.max(-4.5, Math.min(4.5, s.crate + s.velocity * dt));
    if (
      id === "sanctuary" ||
      !players.some((p) =>
        overlap(p, {
          id: "carriage",
          x: next,
          y: 0,
          z: -2,
          w: 1.8,
          h: 1.8,
          d: 1.8,
        }),
      )
    )
      s.crate = next;
    else s.velocity = 0;
  }
  if (id === "manor") {
    const next =
      s.wall +
      Math.max(
        -dt * 1.5,
        Math.min(dt * 1.5, (s.stage === 3 ? 3 : -3) - s.wall),
      );
    if (
      !players.some((p) =>
        overlap(p, {
          id: "sliding-wall",
          x: next,
          y: 0,
          z: -2.8,
          w: 3,
          h: 3,
          d: 0.5,
        }),
      )
    )
      s.wall = next;
  }
  if (id === "garden") {
    s.turbine += ((s.stage ? 1 : 0) - s.turbine) * dt * 0.7;
    s.platform = Math.sin(s.elapsed * 0.7) * 2;
  }
}
export function lineOfSight(from: Point, to: Point, solids: Solid[]) {
  const a = { x: from.x, y: from.y + 1.2, z: from.z },
    b = { x: to.x, y: to.y + 0.6, z: to.z };
  return !solids.some((s) => {
    if (
      Math.abs(b.x - s.x) < s.w / 2 + 0.1 &&
      Math.abs(b.z - s.z) < s.d / 2 + 0.1 &&
      b.y >= s.y &&
      b.y <= s.y + s.h + 0.01
    )
      return false;
    for (let i = 1; i < 20; i++) {
      const t = i / 20,
        x = a.x + (b.x - a.x) * t,
        y = a.y + (b.y - a.y) * t,
        z = a.z + (b.z - a.z) * t;
      if (
        Math.abs(x - s.x) < s.w / 2 &&
        Math.abs(z - s.z) < s.d / 2 &&
        y > s.y &&
        y < s.y + s.h
      )
        return true;
    }
    return false;
  });
}
/** Only discrete, bounded configurations are accepted; mechanics must reach an unlock state as well as have a route. */
export function validatePuzzle(
  id: UniverseId,
  anchorIndex: number,
  variant: number,
  edits: number[],
  decoys: number[],
) {
  const u = universe(id);
  if (
    !Number.isInteger(anchorIndex) ||
    anchorIndex < 0 ||
    anchorIndex >= u.anchors.length ||
    ![0, 1].includes(variant) ||
    edits.length !== CUSTOMIZATION.props ||
    edits.some((x) => ![0, 1].includes(x)) ||
    decoys.length > CUSTOMIZATION.decoys ||
    new Set(decoys).size !== decoys.length ||
    decoys.some((x) => !Number.isInteger(x) || x < 0 || x > 4)
  )
    return false;
  const s = freshMechanism(variant);
  s.stage = id === "manor" ? 3 : 1;
  s.frozen = true;
  for (let i = 0; i < 300; i++) stepMechanism(id, s, 0.05);
  if (!mechanismSolved(id, s)) return false;
  // Search a bounded navigation grid in the fully unlocked configuration. High anchors additionally require a feasible jump/swim ascent.
  const target = u.anchors[anchorIndex],
    solids = mechanismSolids(id, s).filter((b) => b.h > 1.7);
  const queue = [{ x: u.spawn.x, z: u.spawn.z }],
    seen = new Set(["0:6"]);
  let reached = false;
  for (let q = 0; q < queue.length && q < 1200; q++) {
    const p = queue[q];
    if (Math.hypot(p.x - target.x, p.z - target.z) < 2.2) {
      reached = true;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz },
        k = n.x + ":" + n.z;
      if (
        seen.has(k) ||
        Math.abs(n.x) > u.bounds.x - 0.5 ||
        Math.abs(n.z) > u.bounds.z - 0.5 ||
        solids.some(
          (b) =>
            Math.abs(n.x - b.x) < b.w / 2 + 0.3 &&
            Math.abs(n.z - b.z) < b.d / 2 + 0.3,
        )
      )
        continue;
      seen.add(k);
      queue.push(n);
    }
  }
  const rise = u.physics.swim
    ? u.bounds.height
    : u.physics.jump ** 2 / (2 * u.physics.gravity);
  return reached && target.y <= rise + 0.1;
}
