import { test } from "node:test";
import assert from "node:assert/strict";
import { Limiter, text, token, validate } from "./security.js";
test("strict schemas reject spoofing, nonfinite movement, unknown actions and rich text", () => {
  for (const [type, value] of [
    ["move", { x: 0, z: 0, yaw: 0, id: "victim" }],
    ["move", { x: Infinity, z: 0, yaw: 0 }],
    ["ready", { anchor: 0, secret: true, clue: "<img onerror=x>" }],
    ["winner", {}],
    ["start", { id: "host" }],
    ["visit", { owner: 3 }],
  ] as const)
    assert.throws(() => validate(type, value));
  assert.equal(text("  Ａlice  ", 20), "Alice");
  for (const value of ["a\u0000b", "a\u202Eb", "<b>name</b>", "x".repeat(21)])
    assert.throws(() => text(value, 20));
  validate("ready", { anchor: 4, secret: true, clue: "Look behind time." });
});
test("rate limit expires and bounds cardinality; invite entropy and uniqueness", () => {
  const l = new Limiter(2, 100, 2);
  assert.ok(l.take("a", 0));
  assert.ok(l.take("a", 1));
  assert.equal(l.take("a", 2), false);
  assert.ok(l.take("b", 2));
  assert.equal(l.take("c", 3), false);
  assert.ok(l.take("c", 101));
  assert.ok(l.entries.size <= 2);
  const tokens = new Set(Array.from({ length: 1000 }, () => token()));
  assert.equal(tokens.size, 1000);
  assert.ok([...tokens].every((t) => t.length === 43));
});

test("portal winner is atomic and finished gameplay cannot move or search", async () => {
  const { Game } = await import("./game.js");
  const g = new Game("");
  g.add("a", "Alice");
  g.add("b", "Bob");
  g.start("a", 1);
  g.next(2);
  g.next(3);
  for (const p of g.players) {
    p.room = "";
    p.x = 0;
    p.z = 0;
    p.keys = [p.id === "a" ? "b" : "a"];
  }
  g.interact("a", "portal", 4);
  assert.throws(() => g.interact("b", "portal", 4));
  assert.equal(g.winner, "a");
  g.move("a", { x: 0.1, z: 0, yaw: 0 }, 1000);
  assert.equal(g.player("a").x, 0);
  g.finish("b", 5);
  assert.equal(g.winner, "a");
});
test("sustained movement cannot exploit per-packet tolerance", async () => {
  const { Game } = await import("./game.js");
  const g = new Game("");
  g.add("a", "Alice");
  const p = g.player("a");
  p.x = 0;
  p.z = 6;
  for (let i = 0; i < 20; i++)
    g.move("a", { x: p.x + 0.25, z: 6, yaw: 0 }, 1000 + i * 50);
  assert.ok(
    p.x <= 4.28,
    "budget caps sustained travel at run speed plus bounded initial credit",
  );
});

test("production configuration fails closed before listening", async () => {
  const { spawnSync } = await import("node:child_process");
  for (const overrides of [
    {
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "",
      TLS_PROXY: "1",
      FAST_MODE: "",
    },
    {
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "http://localhost:5173",
      TLS_PROXY: "1",
      FAST_MODE: "",
    },
    {
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "https://atrium.example",
      TLS_PROXY: "",
      FAST_MODE: "",
    },
    {
      NODE_ENV: "production",
      ALLOWED_ORIGINS: "https://atrium.example",
      TLS_PROXY: "1",
      FAST_MODE: "1",
    },
    { NODE_ENV: "staging" },
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "apps/server/src/index.ts"],
      { env: { ...process.env, ...overrides }, timeout: 3000, stdio: "pipe" },
    );
    assert.equal(result.status, 1);
    assert.ok(!result.stdout.toString().includes("listening"));
  }
});
