import { test } from "node:test";
import { Game } from "./game.js";
import assert from "node:assert/strict";
import {
  UNIVERSES,
  universe,
  freshMechanism,
  stepMechanism,
  mechanismSolved,
  validatePuzzle,
  mechanismSolids,
  overlap,
  lineOfSight,
  type UniverseId,
} from "../../../packages/shared/src/universes.js";
import {
  stepBody,
  carryPassenger,
  idleInput,
  type Body,
} from "../../../packages/shared/src/physics.js";
const body = (id: UniverseId): Body => ({
  ...universe(id).spawn,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
});
for (const u of UNIVERSES) {
  test(
    u.name +
      ": every anchor and approved configuration passes navigation and mechanical reachability",
    () => {
      for (let anchor = 0; anchor < 5; anchor++)
        for (let variant = 0; variant < 2; variant++)
          for (let mask = 0; mask < 8; mask++)
            assert.ok(
              validatePuzzle(
                u.id,
                anchor,
                variant,
                [mask & 1, (mask >> 1) & 1, (mask >> 2) & 1],
                [0, 2],
              ),
              `${u.id}/${anchor}/${variant}/${mask}`,
            );
      assert.equal(validatePuzzle(u.id, 5, 0, [0, 0, 0], []), false);
      assert.equal(validatePuzzle(u.id, 0, 0, [99, 0, 0], []), false);
      assert.equal(validatePuzzle(u.id, 0, 0, [0, 0, 0], [0, 1, 2]), false);
    },
  );
  test(
    u.name +
      ": a bounded input controller reaches all five hiding anchors using actual simulation",
    () => {
      for (const target of u.anchors) {
        const p = body(u.id),
          s = freshMechanism();
        s.stage = u.id === "manor" ? 3 : 1;
        s.frozen = true;
        let reached = false,
          ascent = 0;
        for (let i = 0; i < 1000; i++) {
          stepMechanism(u.id, s, 0.05, [p]);
          let waypoint = target;
          if (u.id === "forge" && target.z < 0 && p.z > -3.8)
            waypoint = { ...target, x: 0, z: -4 };
          if (u.id === "observatory" && target.y > 0) {
            const entry = { ...target, x: target.x + 2.5 };
            if (ascent === 0 && Math.hypot(p.x - entry.x, p.z - entry.z) < 0.5)
              ascent = 1;
            if (ascent === 1 && p.y > target.y + 0.1) ascent = 2;
            if (ascent < 2) waypoint = entry;
            if (ascent === 2 && p.grounded && p.y < target.y - 0.5) ascent = 0;
          }
          const dx = waypoint.x - p.x,
            dz = waypoint.z - p.z,
            d = Math.hypot(dx, dz);
          if (
            d < 2.2 &&
            Math.abs(p.y - target.y) < 1.2 &&
            lineOfSight(p, target, mechanismSolids(u.id, s))
          ) {
            reached = true;
            break;
          }
          const command = {
            ...idleInput(),
            x: d > 0.3 ? dx / Math.max(1, d) : 0,
            z: d > 0.3 ? dz / Math.max(1, d) : 0,
            run: true,
            jump: u.physics.swim
              ? p.y < target.y - 0.2
              : target.y > p.y + 0.4 && (u.id !== "observatory" || ascent > 0),
            descend: u.physics.swim && p.y > target.y + 0.4,
          };
          stepBody(p, command, u.id, s);
        }
        assert.ok(reached, `${u.id}/${target.id}: ${JSON.stringify(p)}`);
      }
    },
  );
}
test("low gravity produces a higher and longer real jump; swim controls ascend and descend with drag", () => {
  const peak = (id: UniverseId) => {
    const p = body(id),
      s = freshMechanism();
    let max = 0,
      air = 0;
    for (let i = 0; i < 160; i++) {
      stepBody(p, { ...idleInput(), jump: i === 0 }, id, s);
      max = Math.max(max, p.y);
      if (!p.grounded) air++;
    }
    return { max, air };
  };
  const low = peak("observatory"),
    normal = peak("library");
  assert.ok(low.max > normal.max * 2.5);
  assert.ok(low.air > normal.air * 2);
  const p = body("sanctuary"),
    s = freshMechanism();
  for (let i = 0; i < 60; i++)
    stepBody(p, { ...idleInput(), jump: true }, "sanctuary", s);
  assert.ok(p.y > 3);
  const y = p.y;
  for (let i = 0; i < 60; i++)
    stepBody(p, { ...idleInput(), descend: true }, "sanctuary", s);
  assert.ok(p.y < y - 2);
});
test("magnetic polarity and underwater flow move constrained bodies by force; both polarities reverse direction", () => {
  for (const id of ["forge", "sanctuary"] as const) {
    const s = freshMechanism();
    for (let i = 0; i < 150; i++) stepMechanism(id, s, 0.05);
    assert.ok(id === "forge" ? s.crate > 3 : s.crate < -3);
    s.stage = 1;
    const before = s.crate;
    stepMechanism(id, s, 0.05);
    assert.ok(Math.abs(s.crate - before) < 0.2);
    for (let i = 0; i < 150; i++) stepMechanism(id, s, 0.05);
    assert.ok(mechanismSolved(id, s));
    assert.ok(Math.abs(s.crate) <= 4.5);
  }
});
test("dynamic manor walls never advance into a player and match collision geometry", () => {
  const s = freshMechanism();
  s.stage = 3;
  const p = { x: 0, y: 0, z: -2.8 };
  for (let i = 0; i < 100; i++) stepMechanism("manor", s, 0.05, [p]);
  const wall = mechanismSolids("manor", s).find(
    (b) => b.id === "sliding-wall",
  )!;
  assert.ok(!overlap(p, wall));
  assert.ok(s.wall < 0);
  for (let i = 0; i < 150; i++) stepMechanism("manor", s, 0.05, []);
  assert.ok(mechanismSolved("manor", s));
});
test("gusts and currents affect bodies without movement commands; no position/force fields are client inputs", () => {
  const p = body("garden");
  p.z = 0;
  const s = freshMechanism();
  for (let i = 0; i < 50; i++) {
    stepMechanism("garden", s, 0.05);
    stepBody(p, idleInput(), "garden", s);
  }
  assert.ok(p.x < -0.1);
  s.stage = 1;
  for (let i = 0; i < 120; i++) {
    stepMechanism("garden", s, 0.05);
    stepBody(p, idleInput(), "garden", s);
  }
  assert.ok(s.turbine > 0.8);
  assert.ok(p.x > -0.1);
  assert.ok(Math.abs(s.platform) <= 2);
});

test("closed geometry blocks sight; timed shelf waits instead of enclosing a player", () => {
  assert.equal(
    lineOfSight({ x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: -2 }, [
      { id: "wall", x: 0, y: 0, z: 0, w: 3, h: 3, d: 0.5 },
    ]),
    false,
  );
  const s = freshMechanism();
  s.stage = 1;
  s.elapsed = 4;
  stepMechanism("library", s, 0.05, [{ x: 0, y: 0, z: -7.8 }]);
  assert.equal(s.clock, 1);
});

test('authoritative moving supports carry grounded passengers continuously and release airborne bodies', () => {
  const s = freshMechanism(), p = body('garden');
  Object.assign(p, { x: 0, y: 0.7, z: -2, grounded: true });
  for (let tick = 0; tick < 200; tick++) {
    const previous = { ...s }, oldX = p.x;
    stepMechanism('garden', s, 0.05, [p]);
    carryPassenger(p, 'garden', previous, s);
    assert.ok(Math.abs(p.x - oldX) < 0.071, 'bounded continuous displacement');
    assert.ok(Math.abs(p.x - s.platform) < 1e-8, 'no accumulated sliding through support');
    assert.equal(p.y, 0.7);
    assert.ok(!mechanismSolids('garden', s).some(b => overlap(p, b)));
  }
  p.grounded = false;
  const oldX = p.x, previous = { ...s };
  stepMechanism('garden', s, 0.05, [p]);
  carryPassenger(p, 'garden', previous, s);
  assert.equal(p.x, oldX, 'jump detaches passenger');
});

test('passenger transport stops at collision and never attaches a nearby floor player', () => {
  const before = freshMechanism(), after = { ...before, wall: 5 };
  const p = body('manor');
  Object.assign(p, { x: -3, y: 3, z: -2.8, grounded: true });
  carryPassenger(p, 'manor', before, after);
  assert.ok(!mechanismSolids('manor', after).some(b => overlap(p, b)));
  const floor = body('garden');
  Object.assign(floor, { x: 0, y: 0, z: -2, grounded: true });
  carryPassenger(floor, 'garden', freshMechanism(), { ...freshMechanism(), platform: 0.07 });
  assert.equal(floor.x, 0);
});


test('the room tick carries a passenger with wind and supports a legitimate jump off', () => {
  const g=new Game('CARRY',[10000,10000,10000]);
  g.add('a','A');g.add('b','B');g.start('a',1000,1);
  const p=g.player('a');p.universe='garden';
  Object.assign(p,{x:0,y:0.7,z:-2,grounded:true});
  for(let i=1;i<=40;i++) {
    const x=p.x;
    g.tick(1000+i*50);
    assert.ok(Math.abs(p.x-x)<0.12,'support transport stays continuous');
    assert.equal(p.y,0.7,'passenger stays on support while wind also acts');
    assert.ok(Math.abs(p.x-g.state(p).platform)<0.8);
  }
  g.setInput('a',{...idleInput(g.epoch),seq:1,jump:true},3050);
  g.tick(3050);
  assert.ok(p.y>0.7 && !p.grounded,'ordinary bounded jump detaches');
});

test('garden platform waits for a side occupant and resumes without burst displacement', () => {
  const s=freshMechanism(), p={x:1.4,y:0,z:-2};
  for(let i=0;i<100;i++) {
    const previous=s.platform;
    stepMechanism('garden',s,0.05,[p]);
    assert.ok(Math.abs(s.platform-previous)<=0.071);
    assert.ok(!mechanismSolids('garden',s).some(b=>overlap(p,b)), 'never sweeps through a floor player');
  }
  for(let i=0;i<100;i++) {
    const previous=s.platform;
    stepMechanism('garden',s,0.05);
    assert.ok(Math.abs(s.platform-previous)<=0.071,'no catch-up teleport after occupant leaves');
  }
});
