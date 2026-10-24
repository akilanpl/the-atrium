import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client, type Room } from "@colyseus/sdk";
import type { Snapshot } from "../../../packages/shared/src/world.js";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, timeout = 6000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout)
      throw Error("Timed out waiting for synchronized condition");
    await delay(25);
  }
}
test(
  "real Colyseus sockets: join, synchronized movement, phases, replay",
  { timeout: 40000 },
  async () => {
    const server = spawn(
      process.execPath,
      ["--import", "tsx", "apps/server/src/index.ts"],
      { env: { ...process.env, PORT: "2568", FAST_MODE: "1" }, stdio: "pipe" },
    );
    let logs = "";
    server.stderr.on("data", (b) => (logs += b));
    const rooms: Room[] = [];
    try {
      let healthy = false;
      for (let i = 0; i < 60; i++) {
        try {
          healthy = (await fetch("http://localhost:2568/health")).ok;
          if (healthy) break;
        } catch {}
        await delay(100);
      }
      assert.ok(healthy, logs);
      const origin = "http://localhost:5173";
      const client = new Client("ws://localhost:2568", {
        headers: { Origin: origin },
      });
      const admission = async (
        create: boolean,
        invite: string,
        name: string,
        avatar: string,
      ) => {
        const response = await fetch("http://localhost:2568/api/admit", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify({ create, invite, name, avatar }),
        });
        assert.equal(response.status, 200);
        return client.consumeSeatReservation(await response.json());
      };
      assert.equal(
        (await fetch("http://localhost:2568/matchmake/atrium")).status,
        403,
      );
      assert.equal(
        (
          await fetch("http://localhost:2568/api/admit", {
            method: "POST",
            headers: {
              Origin: "https://evil.example",
              "Content-Type": "application/json",
            },
            body: "{}",
          })
        ).status,
        403,
      );
      const a = await admission(true, "", "Alice", "mara");
      rooms.push(a);
      let invite = "";
      a.onMessage("invite", (value: string) => {
        invite = value;
      });
      const views = new Map<string, Snapshot>();
      a.onMessage("snapshot", (s) => views.set("a", s));
      a.onMessage("notice", () => {});
      await until(() => !!invite);
      const b = await admission(false, invite, "Bob", "soren");
      rooms.push(b);
      const remoteHistory: Snapshot[] = [];
      b.onMessage("snapshot", (s) => {
        views.set("b", s);
        remoteHistory.push(s);
      });
      b.onMessage("notice", () => {});
      b.onMessage("invite", () => {});
      await until(
        () =>
          views.get("a")?.players.length === 2 &&
          views.get("b")?.players.length === 2,
      );
      assert.equal(views.get("a")?.players.length, 2);
      assert.equal(views.get("b")?.players.length, 2);
      assert.equal(
        views.get("b")!.players.find((p) => p.id === a.sessionId)!.avatar,
        "mara",
      );
      assert.equal(
        views.get("a")!.players.find((p) => p.id === b.sessionId)!.avatar,
        "soren",
      );
      a.send("input", {
        epoch: views.get("a")!.epoch,
        seq: 1,
        x: 0.5,
        z: 0,
        yaw: 1,
        run: false,
        jump: false,
        descend: false,
      });
      await until(() =>
        remoteHistory.some((s) =>
          s.players.some(
            (p) => p.id === a.sessionId && p.yaw === 1 && p.speed > 0,
          ),
        ),
      );
      const moved = remoteHistory
        .find((s) =>
          s.players.some(
            (p) => p.id === a.sessionId && p.yaw === 1 && p.speed > 0,
          ),
        )!
        .players.find((p) => p.id === a.sessionId)!;
      assert.equal(moved.motion, "walk");
      a.send("start");
      await until(() => views.get("a")?.phase === "PREPARATION");
      assert.equal(views.get("a")!.phase, "PREPARATION");
      a.send("ready", { clue: "clock" });
      b.send("ready", { clue: "books" });
      await until(
        () =>
          views.get("a")?.phase === "EXPLORATION" &&
          views.get("b")?.phase === "EXPLORATION",
      );
      assert.equal(views.get("a")!.phase, "EXPLORATION");
      assert.equal(views.get("a")!.owner, b.sessionId);
      assert.equal(views.get("b")!.owner, a.sessionId);
      assert.ok(!JSON.stringify(views.get("a")).includes("anchor"));
      for (let i = 0; i < 180 && views.get("a")?.phase !== "FINISHED"; i++)
        await delay(100);
      assert.equal(views.get("a")?.phase, "FINISHED");
      assert.equal(views.get("a")?.winner, "");
      assert.equal(views.get("a")?.outcome, "draw");
      a.send("replay");
      await until(() => views.get("a")?.phase === "WAITING");
      assert.equal(views.get("a")?.phase, "WAITING");
      assert.ok(
        views
          .get("a")!
          .players.every((p) => !p.keys.length && !p.ready && !p.room),
      );
    } finally {
      for (const room of rooms) await room.leave();
      server.kill();
    }
  },
);
