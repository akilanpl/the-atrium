import { text } from "./security.js";
import {
  ANCHORS,
  OBJECTS,
  canTravel,
  avatarId,
  motionFor,
  type Player,
  type Phase,
  type Snapshot,
} from "../../../packages/shared/src/world.js";
export class Game {
  players: Player[] = [];
  host = "";
  phase: Phase = "WAITING";
  deadline = 0;
  round = 0;
  started = 0;
  ended = 0;
  winner = "";
  order: string[] = [];
  secrets = new Map<
    string,
    { anchor: number; secret: boolean; clue: string }
  >();
  opened = new Set<string>();
  lastMove = new Map<string, number>();
  movementCredit = new Map<string, number>();
  constructor(
    public code: string,
    public durations = [120000, 90000, 90000],
  ) {}
  add(id: string, name: string, avatar: unknown = "soren") {
    if (this.phase !== "WAITING" || this.players.length >= 4)
      throw Error("This lobby is unavailable.");
    name = text(name, 20);
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      throw Error("Choose a different nickname.");
    this.players.push({
      id,
      name,
      x: this.players.length * 2 - 3,
      z: 6,
      yaw: 0,
      keys: [],
      ready: false,
      room: "",
      connected: true,
      finishedAt: 0,
      avatar: avatarId(avatar),
      motion: "idle",
      speed: 0,
      action: 0,
    });
    this.host ||= id;
  }
  player(id: string) {
    const p = this.players.find((p) => p.id === id);
    if (!p) throw Error("Unknown player");
    return p;
  }
  start(id: string, now = Date.now()) {
    if (
      id !== this.host ||
      this.phase !== "WAITING" ||
      this.players.filter((p) => p.connected).length < 2
    )
      throw Error("Only the host can start with 2–4 players.");
    this.order = this.players.map((p) => p.id);
    this.started = now;
    this.phase = "PREPARATION";
    this.deadline = now + this.durations[0];
    for (const p of this.players) {
      p.room = p.id;
      p.x = 0;
      p.z = 6;
      p.speed = 0;
      p.motion = "idle";
      this.secrets.set(p.id, {
        anchor: 0,
        secret: true,
        clue: "Time keeps more than hours.",
      });
    }
  }
  configure(id: string, data: any) {
    if (this.phase !== "PREPARATION") throw Error("Room editing has ended.");
    const p = this.player(id);
    if (
      !Number.isInteger(data.anchor) ||
      data.anchor < 0 ||
      data.anchor >= ANCHORS.length
    )
      throw Error("Invalid hiding location.");
    this.secrets.set(id, {
      anchor: data.anchor,
      secret: data.anchor === 4 ? true : !!data.secret,
      clue: text(data.clue, 180),
    });
    p.ready = true;
  }
  next(now = Date.now()) {
    if (
      this.phase === "PREPARATION" ||
      (this.phase === "EXPLORATION" && this.round < this.order.length - 1)
    ) {
      this.phase = "EXPLORATION";
      this.round++;
      this.deadline = now + this.durations[1];
      for (const p of this.players) {
        const i = this.order.indexOf(p.id);
        p.room = this.order[(i + this.round) % this.order.length];
        p.x = 0;
        p.z = 6;
        p.speed = 0;
        p.motion = "idle";
      }
    } else if (this.phase === "EXPLORATION") {
      this.phase = "FINALE";
      this.deadline = now + this.durations[2];
      for (const p of this.players) {
        p.room = "";
        p.x = 0;
        p.z = 6;
        p.speed = 0;
        p.motion = "idle";
      }
    } else if (this.phase === "FINALE") {
      const ranked = [...this.players].sort(
        (a, b) =>
          b.keys.length - a.keys.length ||
          (a.finishedAt || Infinity) - (b.finishedAt || Infinity) ||
          this.order.indexOf(a.id) - this.order.indexOf(b.id),
      );
      this.finish(ranked[0].id, now);
    }
  }
  tick(now = Date.now()) {
    for (const p of this.players)
      if (now - (this.lastMove.get(p.id) || 0) > 500) {
        p.speed = 0;
        p.motion = "idle";
      }
    if (
      (this.phase === "PREPARATION" && this.players.every((p) => p.ready)) ||
      (this.deadline && now >= this.deadline && this.phase !== "FINISHED")
    )
      this.next(now);
  }
  move(id: string, data: any, now = Date.now()) {
    const p = this.player(id);
    if (!p.connected || this.phase === "FINISHED") return;
    const last = this.lastMove.get(id) || now - 100;
    const dt = Math.min(0.25, (now - last) / 1000);
    if (dt < 0.025) return;
    this.lastMove.set(id, now);
    const allowance = Math.min(
      0.95,
      (this.movementCredit.get(id) ?? 0.1) + 3.8 * dt,
    );
    this.movementCredit.set(id, allowance);
    const { x, z, yaw } = data;
    if (
      ![x, z, yaw].every(Number.isFinite) ||
      Math.hypot(x - p.x, z - p.z) > allowance
    )
      return;
    const open =
      this.secrets.get(p.room)?.secret === false ||
      this.opened.has(id + ":" + p.room);
    if (!canTravel(p.x, p.z, x, z, !!p.room, open)) return;
    const distance = Math.hypot(x - p.x, z - p.z);
    this.movementCredit.set(id, allowance - distance);
    p.speed = Math.min(6, distance / Math.max(0.025, dt));
    const turn = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
    p.motion = motionFor(p.speed, turn);
    p.x = x;
    p.z = z;
    p.yaw = yaw;
  }
  interact(id: string, object: string, now = Date.now()) {
    const p = this.player(id);
    if (this.phase !== "EXPLORATION" && this.phase !== "FINALE")
      throw Error("Searching is not available yet.");
    if (object === "portal") {
      if (
        p.room ||
        Math.hypot(p.x, p.z) > 2.8 ||
        p.keys.length !== this.order.length - 1
      )
        throw Error(
          "The portal requires every rival key. Approach the center.",
        );
      this.finish(id, now);
      return "The portal is yours.";
    }
    if (!p.room || p.room === id || !this.order.includes(p.room))
      throw Error("Enter an opponent’s library.");
    const o = OBJECTS.find((o) => o.id === object);
    if (!o || Math.hypot(p.x - o.x, p.z - o.z) > 2.8)
      throw Error("Move closer to inspect.");
    const secret = this.secrets.get(p.room)!;
    const visit = id + ":" + p.room;
    const animate = () => {
      p.action++;
      p.yaw = Math.atan2(o.x - p.x, o.z - p.z);
    };
    if (object === "trigger") {
      animate();
      this.opened.add(visit);
      return "The shelf slides aside. A compartment is revealed.";
    }
    if (object === "compartment" && secret.secret && !this.opened.has(visit))
      throw Error(
        "A bookshelf conceals this compartment. Look for a peculiar book.",
      );
    animate();
    if (o.anchor !== secret.anchor)
      return "Only dust and old memories. Keep searching.";
    if (p.keys.includes(p.room)) return "You already carry this key.";
    p.keys.push(p.room);
    if (p.keys.length === this.order.length - 1) p.finishedAt = now;
    return "A key found. Another world unlocked.";
  }
  visit(id: string, owner: string) {
    const p = this.player(id);
    if (this.phase !== "FINALE")
      throw Error("Doors open during the final scramble.");
    if (owner) {
      const i = this.order.indexOf(owner);
      const angle = (i * Math.PI) / 2;
      if (
        owner === id ||
        i < 0 ||
        Math.hypot(p.x - Math.sin(angle) * 10, p.z + Math.cos(angle) * 10) > 3
      )
        throw Error("Approach an opponent’s door.");
    }
    p.room = owner;
    p.x = 0;
    p.z = 6;
  }
  finish(id: string, now: number) {
    if (this.phase === "FINISHED") return;
    this.winner = id;
    this.phase = "FINISHED";
    this.ended = now;
    this.deadline = 0;
  }
  replay(id: string) {
    if (id !== this.host || this.phase !== "FINISHED")
      throw Error("Only the host can replay after results.");
    this.players = this.players.filter((p) => p.connected);
    this.phase = "WAITING";
    this.round = 0;
    this.deadline = 0;
    this.winner = "";
    this.started = 0;
    this.ended = 0;
    this.secrets.clear();
    this.opened.clear();
    this.lastMove.clear();
    this.movementCredit.clear();
    for (const p of this.players) {
      p.keys = [];
      p.ready = false;
      p.room = "";
      p.x = 0;
      p.z = 6;
      p.speed = 0;
      p.motion = "idle";
      p.finishedAt = 0;
      p.speed = 0;
      p.motion = "idle";
      p.action = 0;
    }
  }
  leave(id: string) {
    const p = this.player(id);
    if (this.phase === "WAITING")
      this.players = this.players.filter((p) => p.id !== id);
    else {
      p.connected = false;
      p.ready = true;
    }
    if (this.host === id)
      this.host = this.players.find((p) => p.connected)?.id || "";
  }
  view(id: string): Snapshot {
    const p = this.player(id);
    let clue = this.secrets.get(p.room)?.clue || "";
    if (
      this.phase === "FINALE" &&
      p.room &&
      this.deadline - Date.now() < this.durations[2] / 2
    )
      clue +=
        " Hint: inspect " + ANCHORS[this.secrets.get(p.room)!.anchor] + ".";
    return {
      code: this.code,
      host: this.host,
      phase: this.phase,
      deadline: this.deadline,
      round: this.round,
      players: this.players,
      clue,
      owner: p.room,
      open:
        this.secrets.get(p.room)?.secret === false ||
        this.opened.has(id + ":" + p.room),
      winner: this.winner,
      started: this.started,
      ended: this.ended,
    };
  }
}
