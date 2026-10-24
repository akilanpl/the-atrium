import {
  door,
  UNIVERSES,
  universe,
  mechanismSolids,
  overlap,
  type UniverseId,
  type Point,
  type MechanismState,
  type Solid,
} from "./universes.js";
export const FIXED_STEP = 0.05;
export interface Input {
  epoch: string;
  seq: number;
  x: number;
  z: number;
  yaw: number;
  run: boolean;
  jump: boolean;
  descend: boolean;
}
export interface Body extends Point {
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  yaw: number;
}
export const idleInput = (epoch = ""): Input => ({
  epoch,
  seq: 0,
  x: 0,
  z: 0,
  yaw: 0,
  run: false,
  jump: false,
  descend: false,
});
/** Carry only a grounded passenger of an authoritative translating support.
 * Sweep against the new obstacles; a blocked passenger can step off safely.
 * Never accept a platform transform or passenger displacement from the wire. */
export function carryPassenger(
  body: Body,
  id: UniverseId,
  before: MechanismState,
  after: MechanismState,
) {
  if (!body.grounded) return;
  const old = mechanismSolids(id, before);
  const next = mechanismSolids(id, after);
  for (const support of old) {
    const moved = next.find((s) => s.id === support.id);
    if (!moved || Math.abs(body.y - support.y - support.h) > 0.04 ||
      Math.abs(body.x - support.x) >= support.w / 2 + 0.25 ||
      Math.abs(body.z - support.z) >= support.d / 2 + 0.25) continue;
    const dx = moved.x - support.x, dz = moved.z - support.z;
    if (!dx && !dz) continue;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.05));
    const bounds = universe(id).bounds;
    for (let i = 0; i < steps; i++) {
      const p = { ...body, x: body.x + dx / steps, z: body.z + dz / steps };
      if (Math.abs(p.x) >= bounds.x - 0.35 || Math.abs(p.z) >= bounds.z - 0.35 ||
        next.some((s) => s.id !== support.id && overlap(p, s))) break;
      body.x = p.x;
      body.z = p.z;
    }
    return;
  }
}
export function atriumSolids(): Solid[] {
  return [
    ...UNIVERSES.map((u) => {
      const p = door(u.id);
      return {
        id: u.id,
        x: p.x,
        y: 0,
        z: p.z,
        w: Math.abs(Math.cos(p.angle)) * 3.6 + 0.6,
        h: 5,
        d: Math.abs(Math.sin(p.angle)) * 3.6 + 0.6,
      };
    }),
    ...[-2.9, 2.9].map((x) => ({
      id: "portal",
      x,
      y: 0,
      z: 0,
      w: 0.6,
      h: 2.6,
      d: 0.9,
    })),
  ];
}
export function stepBody(
  body: Body,
  input: Input,
  id: UniverseId | "",
  state: MechanismState,
  dt = FIXED_STEP,
) {
  dt = Math.max(0, Math.min(FIXED_STEP, dt));
  const profile = id
    ? universe(id).physics
    : { gravity: 14, jump: 6.5, drag: 12, swim: false };
  const cap = input.run ? 3.8 : 1.65,
    mag = Math.max(1, Math.hypot(input.x, input.z));
  let fx = 0,
    fz = 0;
  if (id === "garden" && body.z < 2)
    fx = (state.stage ? 1 : -1) * (1.1 + 0.65 * Math.sin(state.elapsed * 1.6));
  if (id === "sanctuary" && body.y < 6) {
    fx = (state.stage ? 1 : -1) * 0.9;
    fz = -0.3;
  }
  const response = body.grounded || profile.swim ? profile.drag : 4;
  body.vx +=
    ((input.x / mag) * cap - body.vx) * Math.min(1, response * dt) + fx * dt;
  body.vz +=
    ((input.z / mag) * cap - body.vz) * Math.min(1, response * dt) + fz * dt;
  if (profile.swim) {
    body.vy +=
      (0.35 +
        (input.jump ? 5 : 0) -
        (input.descend ? 5 : 0) -
        body.vy * profile.drag) *
      dt;
  } else {
    if (input.jump && body.grounded) body.vy = profile.jump;
    body.vy -= profile.gravity * dt;
  }
  body.vx = Math.max(-5, Math.min(5, body.vx));
  body.vz = Math.max(-5, Math.min(5, body.vz));
  body.vy = Math.max(-12, Math.min(7, body.vy));
  const solids = id ? mechanismSolids(id, state) : atriumSolids(),
    bounds = id ? universe(id).bounds : { x: 12, z: 12, height: 9 };
  const inside = (p: Point) =>
    id
      ? Math.abs(p.x) < bounds.x - 0.35 && Math.abs(p.z) < bounds.z - 0.35
      : Math.hypot(p.x, p.z) < 11.65;
  // Axis sweep in <=10 cm pieces, including moving solids; never trust a client position.
  for (const axis of ["x", "z"] as const) {
    const v = axis === "x" ? "vx" : "vz",
      travel = body[v] * dt,
      steps = Math.max(1, Math.ceil(Math.abs(travel) / 0.1));
    for (let i = 0; i < steps; i++) {
      const next = { ...body, [axis]: body[axis] + travel / steps };
      if (inside(next) && !solids.some((b) => overlap(next, b)))
        body[axis] = next[axis];
      else {
        body[v] = 0;
        break;
      }
    }
  }
  const oldY = body.y;
  let newY = body.y + body.vy * dt;
  let floor = !id && Math.hypot(body.x, body.z) < 3.3 ? 0.18 : 0;
  for (const s of solids)
    if (
      Math.abs(body.x - s.x) < s.w / 2 + 0.25 &&
      Math.abs(body.z - s.z) < s.d / 2 + 0.25
    ) {
      const top = s.y + s.h;
      if (body.vy <= 0 && oldY >= top - 0.04 && newY <= top)
        floor = Math.max(floor, top);
      if (body.vy > 0 && oldY + 1.65 <= s.y && newY + 1.65 >= s.y) {
        newY = s.y - 1.65;
        body.vy = 0;
      }
    }
  body.grounded = newY <= floor && body.vy <= 0;
  if (body.grounded) {
    body.y = floor;
    body.vy = 0;
  } else body.y = Math.min(bounds.height - 1.7, newY);
  if (body.y >= bounds.height - 1.7) body.vy = Math.min(0, body.vy);
  if (
    ![body.x, body.y, body.z, body.vx, body.vy, body.vz].every(
      Number.isFinite,
    ) ||
    body.y < -4
  ) {
    Object.assign(body, id ? universe(id).spawn : { x: 0, y: 0, z: 6 }, {
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }
  body.yaw = input.yaw;
}
