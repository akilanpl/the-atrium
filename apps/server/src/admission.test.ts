import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client, type Room } from "@colyseus/sdk";
import WebSocket from "ws";
import type { Snapshot } from "../../../packages/shared/src/world.js";
const port = 20000 + Math.floor(Math.random() * 10000);
const origin = "http://localhost:5173",
  base = `http://127.0.0.1:${port}`;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await pause(30);
  }
  throw Error("Condition timeout");
}
test(
  "private admission, invite revocation, lock, origin, identity, reconnect and flood controls over actual sockets",
  { timeout: 40000 },
  async () => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "apps/server/src/index.ts"],
      {
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: "test",
          TEST_INVITE_TTL_MS: "1500",
        },
        stdio: "pipe",
      },
    );
    let logs = "";
    child.stdout.on("data", (b) => (logs += b));
    child.stderr.on("data", (b) => (logs += b));
    const seats: Room[] = [];
    const client = new Client(`ws://127.0.0.1:${port}`, {
      headers: { Origin: origin },
    });
    const post = (path: string, body: any, allowedOrigin = origin) =>
      fetch(base + path, {
        method: "POST",
        headers: { Origin: allowedOrigin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const admit = (create: boolean, invite = "", name = "Guest") =>
      post("/api/admit", { create, invite, name, avatar: "soren" });
    const connect = async (response: Response) => {
      assert.equal(response.status, 200);
      const room = await client.consumeSeatReservation(await response.json());
      room.onMessage("notice", () => {});
      room.onMessage("invite", () => {});
      room.onMessage("snapshot", () => {});
      seats.push(room);
      return room;
    };
    try {
      for (let i = 0; i < 80; i++) {
        try {
          if ((await fetch(base + "/ready")).ok) break;
        } catch {}
        await pause(50);
      }
      assert.equal(
        (await post("/api/admit", {}, "https://evil.example")).status,
        403,
      );
      for (const path of [
        "/matchmake",
        "/matchmake/create/atrium",
        "/matchmake/join/atrium",
        "/matchmake/joinById/internal",
      ])
        assert.equal((await post(path, {})).status, 403);
      assert.equal((await admit(false, "guessed-room-id")).status, 403);
      assert.equal(
        (await admit(true, "", "<svg/onload=alert(1)>")).status,
        403,
      );
      const host = await connect(await admit(true, "", "Host"));
      assert.equal(host.sessionId.length, 43);
      assert.equal(host.reconnectionToken.split(":")[1].length, 43);
      let invite = "";
      host.onMessage("invite", (v: string) => (invite = v));
      await until(() => !!invite);
      const old = invite;
      host.send("rotateInvite");
      await until(() => invite !== old);
      assert.equal((await admit(false, old)).status, 403);
      host.send("lock");
      await pause(70);
      assert.equal((await admit(false, invite)).status, 403);
      host.send("lock");
      await pause(70);
      const guest = await connect(await admit(false, invite, "Friend"));
      const third = await connect(await admit(false, invite, "Third"));
      const fourth = await connect(await admit(false, invite, "Fourth"));
      assert.equal((await admit(false, invite, "Overflow")).status, 403);
      let hostView: Snapshot | undefined;
      host.onMessage("snapshot", (v: Snapshot) => (hostView = v));
      const other = await connect(await admit(true, "", "Other host"));
      let otherInvite = "";
      other.onMessage("invite", (v: string) => (otherInvite = v));
      await until(() => !!otherInvite);
      await connect(await admit(false, otherInvite, "Other guest"));
      let otherView: Snapshot | undefined;
      other.onMessage("snapshot", (v: Snapshot) => (otherView = v));
      other.send("start");
      await until(
        () =>
          otherView?.phase === "PREPARATION" && hostView?.players.length === 4,
      );
      assert.equal(hostView!.phase, "WAITING");
      assert.ok(!JSON.stringify(hostView).includes("Other host"));
      guest.send("kick", { id: host.sessionId });
      await pause(60);
      assert.ok(host.connection.isOpen);
      host.send("kick", { id: other.sessionId });
      await pause(60);
      assert.ok(other.connection.isOpen);
      const duplicate = await post("/api/admit", {
        create: true,
        invite: "",
        name: "x".repeat(3000),
        avatar: "soren",
      });
      assert.equal(duplicate.status, 400);
      const credential = guest.reconnectionToken;
      const beforeNonHost = invite;
      guest.send("rotateInvite");
      await pause(70);
      assert.equal(invite, beforeNonHost);
      let dropped = false;
      guest.onDrop(() => (dropped = true));
      guest.reconnection.enabled = false;
      guest.connection.close();
      await until(() => dropped || !guest.connection.isOpen);
      await pause(100);
      const recovered = await post("/api/reconnect", { credential });
      const restored = await connect(recovered);
      assert.equal(restored.sessionId, guest.sessionId);
      assert.equal((await post("/api/reconnect", { credential })).status, 403);
      await until(
        () => hostView?.players.filter((p) => p.connected).length === 4,
      );
      assert.equal(new Set(hostView!.players.map((p) => p.id)).size, 4);
      assert.equal(
        (await post("/api/reconnect", { credential: "fake:invalid" })).status,
        403,
      );
      host.send("kick", { id: restored.sessionId });
      await pause(150);
      assert.equal(
        (
          await post("/api/reconnect", {
            credential: restored.reconnectionToken,
          })
        ).status,
        403,
      );
      const denied = await new Promise<number>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/invalid/invalid`, {
          origin: "https://evil.example",
        });
        ws.on("unexpected-response", (_, res) => {
          resolve(res.statusCode!);
          ws.terminate();
        });
        ws.on("error", () => {});
        setTimeout(() => reject(Error("Origin not rejected")), 1000).unref();
      });
      assert.equal(denied, 403);
      third.reconnection.enabled = false;
      const expiredCredential = third.reconnectionToken;
      third.connection.close();
      await pause(21000);
      assert.equal(
        (await post("/api/reconnect", { credential: expiredCredential }))
          .status,
        403,
      );
      other.reconnection.enabled = false;
      other.send("move", { x: 0, z: 0, yaw: 0, padding: "x".repeat(4096) });
      await until(() => !other.connection.isOpen);
      assert.equal((await admit(false, invite)).status, 403);
      const expired = invite;
      host.send("rotateInvite");
      await until(() => invite !== expired);
      for (let i = 0; i < 90; i++) host.send("unknown", { id: "victim" });
      await pause(150);
      assert.equal(
        (await post("/api/reconnect", { credential: host.reconnectionToken }))
          .status,
        403,
      );
      let successor: Snapshot | undefined;
      fourth.onMessage("snapshot", (v: Snapshot) => (successor = v));
      await until(() => successor?.host === fourth.sessionId);
      assert.ok(!logs.includes(old));
      assert.ok(!logs.includes(credential));
    } finally {
      for (const r of seats) {
        r.reconnection.enabled = false;
        try {
          if (r.connection.isOpen) await r.leave();
        } catch {}
      }
      child.kill("SIGKILL");
    }
  },
);
