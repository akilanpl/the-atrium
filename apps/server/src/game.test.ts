import { test } from "node:test";
import assert from "node:assert/strict";
import { Game } from "./game.js";
function setup(n = 2) {
  const g = new Game("TEST", [100, 100, 100]);
  for (let i = 0; i < n; i++) g.add("p" + i, "Player " + i);
  return g;
}
test("host, identity, minimum population, maximum capacity", () => {
  const g = setup(1);
  assert.throws(() => g.start("p0"));
  g.add("p1", "B");
  assert.throws(() => g.add("x", "B"));
  assert.throws(() => g.start("p1"));
  g.add("p2", "C");
  g.add("p3", "D");
  assert.throws(() => g.add("p4", "E"));
});
test("all rotation schedules visit every opponent exactly once", () => {
  for (let n = 2; n <= 4; n++) {
    const g = setup(n);
    g.start("p0", 0);
    const visits = g.players.map(() => new Set());
    for (let r = 1; r < n; r++) {
      g.next(r * 100);
      g.players.forEach((p, i) => {
        assert.notEqual(p.id, p.room);
        visits[i].add(p.room);
      });
    }
    visits.forEach((v) => assert.equal(v.size, n - 1));
    g.next(n * 100);
    assert.equal(g.phase, "FINALE");
  }
});
test("secret validation, proximity, independent keys, portal and replay", () => {
  const g = setup();
  g.start("p0", 1);
  g.configure("p1", { anchor: 4, secret: true, clue: "Behind books" });
  g.configure("p0", { anchor: 0, secret: false, clue: "Time" });
  assert.ok(!JSON.stringify(g.view("p0")).includes("anchor"));
  g.tick(2);
  assert.equal(g.phase, "EXPLORATION");
  assert.throws(() => g.configure("p0", { anchor: 1 }));
  assert.throws(() => g.interact("p0", "compartment"));
  const p = g.player("p0");
  p.x = 0;
  p.z = -6;
  assert.throws(() => g.interact("p0", "compartment"));
  p.x = -3;
  p.z = -6;
  g.interact("p0", "trigger");
  p.x = 0;
  g.interact("p0", "compartment", 10);
  g.interact("p0", "compartment", 11);
  assert.equal(p.keys.length, 1);
  assert.throws(() => g.interact("p0", "portal"));
  g.next(12);
  assert.throws(() => g.interact("p1", "portal"));
  p.x = 0;
  p.z = 0;
  g.interact("p0", "portal", 13);
  assert.equal(g.winner, "p0");
  g.replay("p0");
  assert.equal(g.phase, "WAITING");
  assert.equal(g.player("p0").keys.length, 0);
  assert.equal(g.secrets.size, 0);
  assert.equal(g.opened.size, 0);
});
test("timeouts, disconnect, movement validation and deterministic ranking", () => {
  const g = setup();
  g.start("p0", 10);
  g.tick(110);
  assert.equal(g.phase, "EXPLORATION");
  g.move("p0", { x: 999, z: 0, yaw: 0 }, 200);
  assert.equal(g.player("p0").x, 0);
  g.leave("p0");
  assert.equal(g.host, "p1");
  g.tick(210);
  assert.equal(g.phase, "FINALE");
  g.tick(310);
  assert.equal(g.winner, "p0");
  g.replay("p1");
  assert.equal(g.players.length, 1);
});

test("key copies and mechanisms are independent; finale access is validated", () => {
  const g = setup(3);
  g.start("p0", 0);
  g.configure("p0", { anchor: 4, secret: true, clue: "Pull a book." });
  g.next(1);
  assert.throws(() => g.visit("p1", "p0"));
  g.next(2);
  g.next(3);
  assert.equal(g.phase, "FINALE");
  for (const id of ["p1", "p2"]) {
    const p = g.player(id);
    p.x = 0;
    p.z = -9;
    g.visit(id, "p0");
    p.x = 0;
    p.z = -6;
    assert.throws(() => g.interact(id, "compartment"));
    p.x = -3;
    g.interact(id, "trigger");
    p.x = 0;
    g.interact(id, "compartment");
    assert.deepEqual(p.keys, ["p0"]);
  }
  const p = g.player("p1");
  g.visit("p1", "");
  assert.throws(() => g.visit("p1", "p1"));
  assert.throws(() => g.visit("p1", "not-an-owner"));
  p.x = 0;
  p.z = 0;
  assert.throws(() => g.interact("p1", "portal"));
});
