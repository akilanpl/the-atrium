import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { Client, type Room } from "@colyseus/sdk";
import { universe } from "../../../packages/shared/src/universes.js";
import type { Snapshot } from "../../../packages/shared/src/world.js";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function eventually(check: () => boolean, timeout = 8000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout)
      throw Error("Multiplayer condition timed out");
    await pause(30);
  }
}
async function match(n: number) {
  const port = 31000 + Math.floor(Math.random() * 10000),
    origin = "http://localhost:5173",
    base = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "apps/server/src/index.ts"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "test",
        FAST_MODE: "",
        PREPARATION_MS: "15000",
        EXPLORATION_MS: "20000",
        FINALE_MS: "20000",
      },
      stdio: "pipe",
    },
  );
  let serverRSS = 0;
  child.stdout.on("data", (b) => {
    for (const line of String(b).split("\n")) {
      try {
        const j = JSON.parse(line);
        if (j.event === "metrics") serverRSS = j.rss;
      } catch {}
    }
  });
  let errors = "";
  child.stderr.on("data", (b) => (errors += b));
  const rooms: Room[] = [],
    views = new Map<string, Snapshot>(),
    seq = new Map<string, number>(),
    held = new Map<string, number>(),
    sealed = new Set<string>(),
    placed = new Set<string>(),
    lastAction = new Map<string, number>(),
    visits = new Map<string, Set<string>>();
  let bytes = 0,
    packets = 0,
    firstByte = Date.now(),
    tick: ReturnType<typeof setInterval> | undefined;
  const client = new Client(`ws://127.0.0.1:${port}`, {
    headers: { Origin: origin },
  });
  try {
    await eventually(() => errors.length > 0 || false, 50).catch(() => {});
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/health")).ok) break;
      } catch {}
      await pause(50);
    }
    const admit = async (create: boolean, invite: string, name: string) => {
      const res = await fetch(base + "/api/admit", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({
          create,
          invite,
          name,
          avatar: rooms.length % 2 ? "mara" : "soren",
        }),
      });
      assert.equal(res.status, 200, errors);
      return client.consumeSeatReservation(await res.json());
    };
    const attach = (r: Room) => {
      rooms.push(r);
      visits.set(r.sessionId, new Set());
      r.reconnection.maxEnqueuedMessages = 0;
      r.onMessage("snapshot", (s: Snapshot) => {
        views.set(r.sessionId, s);
        if (s.phase === "EXPLORATION") visits.get(r.sessionId)!.add(s.owner);
      });
      r.onMessage("notice", (message: string) => {
        if (message.startsWith("Your key is hidden")) placed.add(r.sessionId);
      });
      r.onMessage("invite", () => {});
      (r.connection.transport as any).ws.addEventListener(
        "message",
        (event: any) => {
          const data = event.data;
          bytes += data.byteLength || data.size || 0;
          packets++;
        },
      );
    };
    const host = await admit(true, "", "Host");
    attach(host);
    let invite = "";
    host.onMessage("invite", (s: string) => (invite = s));
    await eventually(() => !!invite);
    for (let i = 1; i < n; i++)
      attach(await admit(false, invite, "Guest " + i));
    await eventually(() => views.get(host.sessionId)?.players.length === n);
    bytes = 0;
    packets = 0;
    const idleStart = Date.now();
    await pause(5000);
    const idlePerClientBytesPerSecond = Math.round(
      bytes / ((Date.now() - idleStart) / 1000) / n,
    );
    bytes = 0;
    packets = 0;
    firstByte = Date.now();
    host.send("start");
    tick = setInterval(() => {
      for (const r of rooms) {
        const s = views.get(r.sessionId),
          p = s?.players.find((p) => p.id === r.sessionId);
        if (!s || !p || s.phase === "FINISHED") continue;
        let x = 0,
          z = 0,
          jump = false,
          descend = false;
        const now = Date.now();
        if (
          s.phase === "PREPARATION" ||
          s.phase === "EXPLORATION" ||
          s.phase === "FINALE"
        ) {
          const u = s.world ? universe(s.world) : null,
            target = u ? u.anchors[0] : { x: 0, y: 0, z: 0 },
            dx = target.x - p.x,
            dz = target.z - p.z,
            d = Math.hypot(dx, dz),
            done =
              s.phase === "PREPARATION"
                ? placed.has(r.sessionId)
                : s.world
                  ? p.keys.includes(s.owner)
                  : false;
          if (!done && d > 1.9) {
            x = dx / Math.max(1, d);
            z = dz / Math.max(1, d);
          }
          jump = !!u?.physics.swim && p.y < target.y - 0.3;
          descend = !!u?.physics.swim && p.y > target.y + 0.5;
          if (
            d < 2.3 &&
            Math.abs(p.y - target.y) < 1.8 &&
            now - (lastAction.get(r.sessionId) || 0) > 550
          ) {
            lastAction.set(r.sessionId, now);
            if (s.phase === "PREPARATION") {
              if (!held.has(r.sessionId)) {
                r.send("hide", { object: u!.anchors[0].id });
                held.set(r.sessionId, now);
              } else if (
                !placed.has(r.sessionId) &&
                now - held.get(r.sessionId)! > 700
              )
                r.send("place", { object: u!.anchors[0].id });
              else if (placed.has(r.sessionId) && !sealed.has(r.sessionId)) {
                r.send("ready", {
                  clue: "The first landmark keeps my secret.",
                });
                sealed.add(r.sessionId);
              }
            } else if (!s.world) r.send("interact", { object: "portal" });
            else if (!done) r.send("interact", { object: u!.anchors[0].id });
          }
        }
        r.send("input", {
          epoch: s.epoch,
          seq: (seq.get(r.sessionId) || 0) + 1,
          x,
          z,
          yaw: Math.atan2(x, z),
          run: true,
          jump,
          descend,
        });
        seq.set(r.sessionId, (seq.get(r.sessionId) || 0) + 1);
      }
    }, 50);
    await eventually(
      () =>
        views.size === n &&
        [...views.values()].every((s) => s.phase === "FINISHED"),
      110000,
    );
    const final = views.get(host.sessionId)!;
    assert.equal(
      final.outcome,
      "portal",
      JSON.stringify({
        n,
        phase: final.phase,
        keys: final.players.map((p) => p.keys.length),
      }),
    );
    assert.ok(final.winner);
    assert.ok(final.players.every((p) => p.keys.length === n - 1));
    assert.equal(placed.size, n);
    assert.equal(new Set(final.players.map((p) => p.universe)).size, n);
    for (const [id, v] of visits) {
      assert.equal(v.size, n - 1);
      assert.ok(!v.has(id));
    }
    assert.ok([...views.values()].every((s) => s.winner === final.winner));
    clearInterval(tick);
    tick = undefined;
    const duration = Date.now() - firstByte,
      bandwidth = bytes / (duration / 1000);
    host.send("replay");
    await eventually(() =>
      [...views.values()].every((s) => s.phase === "WAITING"),
    );
    assert.ok(
      views
        .get(host.sessionId)!
        .players.every((p) => !p.keys.length && !p.universe && p.y === 0),
    );
    serverRSS = (await (await fetch(base + "/ready")).json()).rss || serverRSS;
    return {
      players: n,
      portalWinner: true,
      placedKeys: placed.size,
      rounds: n - 1,
      worlds: new Set(final.players.map((p) => p.universe)).size,
      matchMs: duration,
      receivedFrameBytes: bytes,
      receivedFrames: packets,
      aggregateBytesPerSecond: Math.round(bandwidth),
      perClientBytesPerSecond: Math.round(bandwidth / n),
      idlePerClientBytesPerSecond,
      serverRSS,
      clientProcessHeap: process.memoryUsage().heapUsed,
    };
  } finally {
    if (tick) clearInterval(tick);
    for (const r of rooms) {
      r.reconnection.enabled = false;
      if (r.connection.isOpen) await r.leave();
    }
    child.kill("SIGKILL");
  }
}
test(
  "observable input-driven complete matches for every population 2–6: hide, seal, all rounds, portal, consensus and replay",
  { timeout: 125000 },
  async () => {
    const results = await Promise.all([2, 3, 4, 5, 6].map(match));
    await mkdir("work", { recursive: true });
    await writeFile(
      "work/05-network-benchmarks.json",
      JSON.stringify(results, null, 2),
    );
    assert.equal(results.length, 5);
  },
);
