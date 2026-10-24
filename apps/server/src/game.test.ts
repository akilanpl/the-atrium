import { test } from "node:test";
import assert from "node:assert/strict";
import { Game } from "./game.js";
import {
  door,
  UNIVERSES,
  universe,
} from "../../../packages/shared/src/universes.js";
const setup = (n = 2) => {
  const g = new Game("TEST", [100, 100, 100]);
  for (let i = 0; i < n; i++) g.add("p" + i, "Player " + i);
  return g;
};
test("host, normalized identity, minimum population and maximum six-player capacity", () => {
  const g = setup(1);
  assert.throws(() => g.start("p0"));
  g.add("p1", "B");
  assert.throws(() => g.add("x", "Ｂ"));
  assert.throws(() => g.start("p1"));
  for (let i = 2; i < 6; i++) g.add("p" + i, "P" + i);
  assert.throws(() => g.add("p6", "Seventh"));
  assert.equal(new Set(g.players.map((p) => `${p.x}:${p.z}`)).size, 6);
});
test("every 2–6-player rotation is a bijection visiting exactly every opponent; unique world assignments", () => {
  for (let n = 2; n <= 6; n++) {
    const g = setup(n);
    g.start("p0", 1, 123);
    const visits = g.players.map(() => new Set<string>());
    assert.equal(new Set(g.players.map((p) => p.universe)).size, n);
    for (let r = 1; r < n; r++) {
      g.next(r * 100);
      const owners = new Set<string>();
      g.players.forEach((p, i) => {
        assert.notEqual(p.id, p.room);
        visits[i].add(p.room);
        owners.add(p.room);
      });
      assert.equal(owners.size, n);
    }
    visits.forEach((v) => assert.equal(v.size, n - 1));
    g.next(n * 100);
    assert.equal(g.phase, "FINALE");
  }
});
test("private preparation, held placement, immutable configuration, mechanisms, idempotent keys, portal and replay", () => {
  const g = setup();
  g.start("p0", 1, 123);
  g.player("p1").universe = "library";
  const owner = g.player("p1");
  owner.x = 0;
  owner.z = -6;
  assert.throws(() => g.hide("p1", "compartment", true, 2));
  g.hide("p1", "compartment", false, 3);
  assert.throws(() => g.hide("p1", "compartment", true, 100));
  g.hide("p1", "compartment", false, 200);
  g.hide("p1", "compartment", true, 900);
  g.configure("p1", { clue: "Behind the unfinished volume." });
  g.configure("p0", { clue: "Clue" });
  assert.equal(g.view("p1").workshop?.anchor, 4);
  assert.throws(() => g.edit("p1", "variant", { variant: 1 }));
  g.tick(2);
  assert.equal(g.phase, "EXPLORATION");
  assert.equal(g.view("p0").workshop, undefined);
  assert.ok(!JSON.stringify(g.view("p0")).includes("anchor"));
  assert.throws(() => g.configure("p0", { clue: "Late" }));
  const p = g.player("p0");
  p.x = 0;
  p.z = -6;
  assert.throws(() => g.interact("p0", "compartment"));
  p.x = -3;
  g.interact("p0", "trigger");
  g.interact("p0", "brake");
  p.x = 0;
  g.interact("p0", "compartment", 10);
  g.interact("p0", "compartment", 11);
  assert.deepEqual(p.keys, ["p1"]);
  assert.throws(() => g.interact("p0", "portal"));
  g.next(12);
  p.x = 0;
  p.z = 0;
  g.interact("p0", "portal", 13);
  assert.equal(g.winner, "p0");
  g.replay("p0");
  assert.equal(g.secrets.size, 0);
  assert.equal(g.mechanisms.size, 0);
  assert.equal(g.inputs.size, 0);
  assert.ok(
    g.players.every((p) => !p.keys.length && !p.universe && p.vy === 0),
  );
});
test("timeouts enter overtime then draw on tied/empty progress; disconnected guests never win", () => {
  const g = setup();
  g.start("p0", 10);
  g.tick(110);
  assert.equal(g.phase, "EXPLORATION");
  g.leave("p0");
  assert.equal(g.host, "p1");
  g.tick(210);
  g.tick(310);
  assert.ok(g.overtime);
  g.tick(410);
  assert.equal(g.phase, "FINISHED");
  assert.equal(g.winner, "");
  assert.equal(g.outcome, "draw");
  g.replay("p1");
  assert.equal(g.players.length, 1);
});
test("independent key copies and mechanisms; six data-driven doors validate owner and distance", () => {
  const g = setup(3);
  g.start("p0", 1, 8);
  g.player("p0").universe = "library";
  g.configure("p0", { anchor: 4, clue: "Pull a book." });
  g.next(2);
  assert.throws(() => g.visit("p1", "p0"));
  g.next(3);
  g.next(4);
  for (const id of ["p1", "p2"]) {
    const p = g.player(id),
      d = door("library");
    p.x = d.x;
    p.z = d.z + 1;
    g.visit(id, "p0");
    p.x = 0;
    p.z = -6;
    assert.throws(() => g.interact(id, "compartment"));
    p.x = -3;
    g.interact(id, "trigger");
    g.interact(id, "brake");
    p.x = 0;
    g.interact(id, "compartment");
    assert.deepEqual(p.keys, ["p0"]);
    g.visit(id, "");
    assert.throws(() => g.visit(id, id));
    assert.throws(() => g.visit(id, "no-owner"));
  }
  assert.equal(UNIVERSES.length, 6);
  assert.ok(
    universe("observatory").physics.gravity <
      universe("library").physics.gravity,
  );
});

test("customization has bounded undo/reset, safe props, two decoys and sealing ownership", () => {
  const g = setup();
  g.start("p0", 1, 123);
  g.edit("p0", "edit", { prop: 1, slot: 1 });
  assert.equal(g.secrets.get("p0")!.edits[1], 1);
  g.edit("p0", "undo");
  assert.equal(g.secrets.get("p0")!.edits[1], 0);
  g.edit("p0", "decoy", { anchor: 1 });
  g.edit("p0", "decoy", { anchor: 2 });
  assert.throws(() => g.edit("p0", "decoy", { anchor: 3 }));
  g.edit("p0", "undo");
  assert.deepEqual(g.secrets.get("p0")!.decoys, [1]);
  assert.throws(() => g.edit("p0", "edit", { prop: 100, slot: 9 }));
  g.edit("p0", "reset");
  assert.deepEqual(g.secrets.get("p0")!.decoys, []);
  g.configure("p0", { clue: "Sealed." });
  assert.throws(() => g.hide("p0", "clock"));
  assert.throws(() => g.edit("p0", "reset"));
});
test("private rival transforms and hiding selections are redacted; overtime reveals only the visited clue", () => {
  const g = setup();
  g.start("p0", 10, 123);
  g.player("p1").x = 6;
  g.player("p1").z = -5;
  assert.equal(g.view("p0").players.find((p) => p.id === "p1")!.x, 0);
  g.next(11);
  assert.equal(g.view("p0").workshop, undefined);
  const a = g.view("p0", 12),
    later = g.view("p0", 100);
  assert.ok(later.clue.includes("Mechanic:"));
  assert.ok(!a.clue.includes("Overtime:"));
  g.next(111);
  const p = g.player("p0"),
    other = g.player("p1"),
    d = door(other.universe || "library");
  p.x = d.x;
  p.z = d.z + 1;
  g.visit(p.id, other.id);
  g.overtime = true;
  assert.ok(g.view(p.id).clue.includes("Overtime: inspect"));
});
test("finale has six separate equally distant spawn points, no overlap, and meaningful timeout policy", () => {
  const g = setup(6);
  g.start("p0", 1, 123);
  for (let i = 0; i < 6; i++) g.next(i + 2);
  assert.equal(g.phase, "FINALE");
  assert.equal(new Set(g.players.map((p) => `${p.x}:${p.z}`)).size, 6);
  for (const p of g.players)
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - 6) < 0.001);
  g.player("p2").keys = ["p1"];
  g.next(20);
  assert.ok(g.overtime);
  g.next(120);
  assert.equal(g.winner, "p2");
  assert.equal(g.outcome, "timeout");
});

test('100–350ms delayed and reordered input remains bounded and stale replay cannot move a new match', () => {
  const g = setup();
  g.start('p0', 1000, 9);
  const p = g.player('p0');
  const pending = Array.from({length: 20}, (_, i) => ({
    at: 1050 + i * 50 + (i % 3 === 0 ? 350 : 100),
    command: { epoch: g.epoch, seq: i + 1, x: 1, z: 0, yaw: 0, run: true, jump: false, descend: false },
  })).sort((a,b) => a.at-b.at);
  for (let now = 1050; now <= 3000; now += 50) {
    while (pending.length && pending[0].at <= now) {
      const packet = pending.shift()!;
      g.setInput('p0', packet.command, now);
    }
    const previous = { x:p.x, y:p.y, z:p.z };
    g.tick(now);
    assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z) <= 0.36, 'no burst teleport after delivery');
    assert.ok(Number.isFinite(p.y) && p.y >= 0);
    assert.ok(Math.hypot(p.vx,p.vz) <= 7.08);
  }
  assert.ok(Math.abs(p.vx) < 0.01, 'dropped release is bounded by deadman');
  const staleEpoch = g.epoch;
  g.phase = 'FINISHED';
  g.replay('p0');
  g.start('p0', 4000, 9);
  const x=p.x;
  g.setInput('p0',{epoch:staleEpoch,seq:999,x:1,z:0,yaw:0,run:true,jump:true,descend:false},4100);
  g.tick(4150);
  assert.equal(p.x,x);
});
