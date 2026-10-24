import { randomInt } from "node:crypto";
import { text, token } from "./security.js";
import {
  avatarId,
  motionFor,
  type Player,
  type Phase,
  type Snapshot,
} from "../../../packages/shared/src/world.js";
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  CUSTOMIZATION,
  door,
  universe,
  objects,
  shuffledUniverses,
  freshMechanism,
  stepMechanism,
  mechanismSolved,
  mechanismSolids,
  lineOfSight,
  validatePuzzle,
  type MechanismState,
} from "../../../packages/shared/src/universes.js";
import {
  stepBody,
  idleInput,
  FIXED_STEP,
  type Input,
} from "../../../packages/shared/src/physics.js";
interface Puzzle {
  anchor: number;
  secret: boolean;
  clue: string;
  variant: number;
  edits: number[];
  decoys: number[];
}
export class Game {
  players: Player[] = [];
  host = "";
  phase: Phase = "WAITING";
  deadline = 0;
  round = 0;
  started = 0;
  ended = 0;
  winner = "";
  outcome = "";
  overtime = false;
  epoch = token();
  order: string[] = [];
  secrets = new Map<string, Puzzle>();
  opened = new Set<string>();
  lastMove = new Map<string, number>();
  movementCredit = new Map<string, number>();
  mechanisms = new Map<string, MechanismState>();
  inputs = new Map<string, { input: Input; at: number }>();
  sequences = new Map<string, number>();
  hiding = new Map<string, { object: string; at: number }>();
  history = new Map<string, Puzzle[]>();
  inspected = new Set<string>();
  lastSimulation = 0;
  accumulator = 0;
  early = 0;
  constructor(
    public code: string,
    public durations = [120000, 90000, 90000],
  ) {}
  add(id: string, name: string, avatar: unknown = "soren") {
    if (this.phase !== "WAITING" || this.players.length >= MAX_PLAYERS)
      throw Error("This lobby is unavailable.");
    name = text(name, 20);
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      throw Error("Choose a different nickname.");
    const i = this.players.length,
      a = (Math.PI * 2 * i) / MAX_PLAYERS;
    this.players.push({
      id,
      name,
      x: Math.sin(a) * 6,
      y: 0,
      z: Math.cos(a) * 6,
      yaw: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      universe: "",
      inspections: 0,
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
    if (!p) throw Error("Unknown player.");
    return p;
  }
  start(id: string, now = Date.now(), seed = randomInt(1, 2147483647)) {
    if (
      id !== this.host ||
      this.phase !== "WAITING" ||
      this.players.filter((p) => p.connected).length < MIN_PLAYERS
    )
      throw Error("Only the host can start with 2–6 players.");
    this.players = this.players.filter((p) => p.connected);
    this.order = this.players.map((p) => p.id);
    this.epoch = token();
    const assigned = shuffledUniverses(seed);
    this.started = now;
    this.lastSimulation = now;
    this.phase = "PREPARATION";
    this.deadline = now + this.durations[0];
    this.players.forEach((p, i) => {
      p.universe = assigned[i];
      this.secrets.set(p.id, {
        anchor: 0,
        secret: true,
        clue: universe(p.universe).hint,
        variant: 0,
        edits: [0, 0, 0],
        decoys: [],
      });
      this.transition(p, p.id);
    });
  }
  transition(p: Player, owner: string) {
    p.room = owner;
    Object.assign(
      p,
      owner
        ? universe(this.player(owner).universe).spawn
        : {
            x:
              Math.sin((this.players.indexOf(p) * Math.PI * 2) / MAX_PLAYERS) *
              6,
            y: 0,
            z:
              Math.cos((this.players.indexOf(p) * Math.PI * 2) / MAX_PLAYERS) *
              6,
          },
      { vx: 0, vy: 0, vz: 0, grounded: true, speed: 0, motion: "idle" },
    );
    this.inputs.delete(p.id);
    this.hiding.delete(p.id);
    this.early = 0;
  }
  state(p: Player) {
    const k = p.id + ":" + p.room;
    let s = this.mechanisms.get(k);
    if (!s) {
      s = freshMechanism(this.secrets.get(p.room)?.variant || 0);
      this.mechanisms.set(k, s);
    }
    return s;
  }
  configure(id: string, data: any) {
    const p = this.player(id);
    if (this.phase !== "PREPARATION" || p.ready || p.room !== id)
      throw Error("Room editing has ended.");
    const secret = this.secrets.get(id)!;
    // Direct class API retains anchor configuration for deterministic server fixtures; socket ready schema accepts clue only.
    if (data.anchor !== undefined) {
      if (!Number.isInteger(data.anchor) || data.anchor < 0 || data.anchor > 4)
        throw Error("Invalid location.");
      secret.anchor = data.anchor;
    }
    secret.clue = text(data.clue, 180);
    if (
      !validatePuzzle(
        p.universe || "library",
        secret.anchor,
        secret.variant,
        secret.edits,
        secret.decoys,
      )
    )
      throw Error(
        "This puzzle has no validated solution. Reset modifications.",
      );
    p.ready = true;
  }
  edit(id: string, type: string, data: any = {}) {
    const p = this.player(id);
    if (this.phase !== "PREPARATION" || p.ready || p.room !== id)
      throw Error("Your world is sealed.");
    const previous = this.secrets.get(id)!;
    const q = structuredClone(previous);
    if (type === "undo") {
      const old = this.history.get(id)?.pop();
      if (old) {
        this.secrets.set(id, old);
        this.mechanisms.delete(id + ":" + id);
      }
      return;
    }
    if (type === "reset") {
      q.edits = [0, 0, 0];
      q.decoys = [];
      q.variant = 0;
      q.anchor = 0;
    } else if (type === "edit") {
      if (
        !Number.isInteger(data.prop) ||
        data.prop < 0 ||
        data.prop >= CUSTOMIZATION.props ||
        ![0, 1].includes(data.slot)
      )
        throw Error("Choose an approved position.");
      q.edits[data.prop] = data.slot;
    } else if (type === "variant") {
      if (![0, 1].includes(data.variant))
        throw Error("Invalid mechanism configuration.");
      q.variant = data.variant;
      this.mechanisms.delete(id + ":" + id);
    } else if (type === "decoy") {
      if (!Number.isInteger(data.anchor) || data.anchor < 0 || data.anchor > 4)
        throw Error("Invalid decoy.");
      if (q.decoys.includes(data.anchor))
        q.decoys = q.decoys.filter((x) => x !== data.anchor);
      else if (q.decoys.length < CUSTOMIZATION.decoys)
        q.decoys.push(data.anchor);
      else throw Error("Two decoys maximum.");
    } else throw Error("Invalid edit.");
    if (
      !validatePuzzle(
        p.universe || "library",
        q.anchor,
        q.variant,
        q.edits,
        q.decoys,
      )
    ) {
      throw Error("Unsafe configuration.");
    }
    const h = this.history.get(id) || [];
    h.push(structuredClone(previous));
    if (h.length > 10) h.shift();
    this.history.set(id, h);
    this.secrets.set(id, q);
    if (type === "reset" || previous.variant !== q.variant)
      this.mechanisms.delete(id + ":" + id);
  }
  hide(id: string, object: string, complete = false, now = Date.now()) {
    const p = this.player(id);
    if (this.phase !== "PREPARATION" || p.ready || p.room !== id)
      throw Error("Hiding is closed.");
    const o = this.target(p, object);
    if (o.anchor < 0) throw Error("Choose a hiding anchor.");
    if (!complete) {
      this.hiding.set(id, { object, at: now });
      return "Hold E for at least 0.6 seconds, then release to place.";
    }
    const h = this.hiding.get(id);
    this.hiding.delete(id);
    if (!h || h.object !== object || now - h.at < 600 || now - h.at > 5000)
      throw Error("Hold E longer near the same anchor.");
    this.secrets.get(id)!.anchor = o.anchor;
    return "Your key is hidden at " + o.name + ".";
  }
  setInput(id: string, input: Input, now = Date.now()) {
    const p = this.player(id);
    if (
      input.epoch !== this.epoch ||
      input.seq <= (this.sequences.get(id) ?? -1) ||
      !p.connected ||
      this.phase === "FINISHED"
    )
      return;
    this.sequences.set(id, input.seq);
    this.inputs.set(id, { input, at: now });
  }
  /** Legacy position messages deliberately cannot move authoritative bodies. */
  move(_id: string, _data: unknown, _now = Date.now()) {
    return;
  }
  next(now = Date.now()) {
    if (
      this.phase === "PREPARATION" ||
      (this.phase === "EXPLORATION" && this.round < this.order.length - 1)
    ) {
      this.phase = "EXPLORATION";
      this.round++;
      this.deadline = now + this.durations[1];
      for (const p of this.players)
        this.transition(
          p,
          this.order[
            (this.order.indexOf(p.id) + this.round) % this.order.length
          ],
        );
    } else if (this.phase === "EXPLORATION") {
      this.phase = "FINALE";
      this.deadline = now + this.durations[2];
      for (const p of this.players) this.transition(p, "");
    } else if (this.phase === "FINALE") {
      const ranked = this.players
        .filter((p) => p.connected)
        .sort((a, b) => b.keys.length - a.keys.length);
      if (!this.overtime) {
        this.overtime = true;
        this.deadline = now + Math.min(45000, this.durations[2]);
        return;
      }
      if (
        ranked[0]?.keys.length > 0 &&
        ranked[0].keys.length > (ranked[1]?.keys.length ?? -1)
      ) {
        this.outcome = "timeout";
        this.finish(ranked[0].id, now);
      } else {
        this.outcome = "draw";
        this.finish("", now);
      }
    }
  }
  tick(now = Date.now()) {
    if (this.phase !== "FINISHED") {
      this.accumulator += Math.min(
        0.25,
        Math.max(0, (now - (this.lastSimulation || now - 50)) / 1000),
      );
      this.lastSimulation = now;
      while (this.accumulator >= FIXED_STEP - 0.000001) {
        this.accumulator -= FIXED_STEP;
        for (const p of this.players.filter((p) => p.connected)) {
          const s = this.state(p);
          if (p.room)
            stepMechanism(
              this.player(p.room).universe || "library",
              s,
              FIXED_STEP,
              [p],
            );
          const command = this.inputs.get(p.id),
            input =
              command && now - command.at < 250
                ? command.input
                : { ...idleInput(this.epoch), yaw: p.yaw };
          const oldYaw = p.yaw;
          stepBody(p, input, p.room ? this.player(p.room).universe : "", s);
          p.speed = Math.hypot(p.vx, p.vz);
          p.motion = motionFor(p.speed, p.yaw - oldYaw);
        }
      }
    }
    if (this.phase === "EXPLORATION") {
      const eligible = this.players.filter((p) => p.connected);
      if (eligible.length && eligible.every((p) => p.keys.includes(p.room))) {
        this.early ||= now + 3000;
        if (now >= this.early) {
          this.next(now);
          return;
        }
      } else this.early = 0;
    }
    if (
      this.phase === "PREPARATION" &&
      this.players.filter((p) => p.connected).every((p) => p.ready)
    )
      this.next(now);
    else if (this.deadline && now >= this.deadline && this.phase !== "FINISHED")
      this.next(now);
  }
  target(p: Player, object: string) {
    if (!p.room) throw Error("Enter a universe.");
    const u = this.player(p.room).universe || "library",
      o = objects(u).find((o) => o.id === object);
    if (
      !o ||
      Math.hypot(p.x - o.x, p.z - o.z, p.y - o.y) > 2.7 ||
      !lineOfSight(p, o, mechanismSolids(u, this.state(p)))
    )
      throw Error("Move closer with a clear view.");
    return o;
  }
  interact(id: string, object: string, now = Date.now()) {
    const p = this.player(id);
    if (!p.connected) throw Error("Unavailable.");
    if (object === "portal") {
      if (
        this.phase !== "FINALE" ||
        p.room ||
        Math.hypot(p.x, p.z, p.y) > 2.8 ||
        p.keys.length !== this.order.length - 1
      )
        throw Error("Approach the portal with every rival key.");
      this.outcome = "portal";
      this.finish(id, now);
      return "The portal is yours.";
    }
    if (!["PREPARATION", "EXPLORATION", "FINALE"].includes(this.phase))
      throw Error("Searching is unavailable.");
    if (p.room === id && this.phase !== "PREPARATION")
      throw Error("Enter an opponent universe.");
    const o = this.target(p, object),
      s = this.state(p),
      u = this.player(p.room).universe || "library";
    p.action++;
    p.yaw = Math.atan2(o.x - p.x, o.z - p.z);
    if (o.action) {
      if (o.action === "brake") s.frozen = !s.frozen;
      else if (u === "manor") s.stage ^= o.action === "second" ? 2 : 1;
      else s.stage = s.stage ? 0 : 1;
      if (u === "library" && s.stage) this.opened.add(id + ":" + p.room);
      return o.name + " activated. " + universe(u).hint;
    }
    const q = this.secrets.get(p.room)!;
    if (o.anchor === 4 && !mechanismSolved(u, s)) throw Error(universe(u).hint);
    if (this.phase === "PREPARATION")
      return o.anchor === q.anchor
        ? "Test successful: your key is reachable here."
        : "An approved hiding anchor. Hold E here to hide your key.";
    const check = id + ":" + p.room + ":" + o.id;
    if (!this.inspected.has(check)) {
      this.inspected.add(check);
      p.inspections++;
    }
    if (q.decoys.includes(o.anchor) && o.anchor !== q.anchor)
      return "A harmless decoy. Follow the clue.";
    if (o.anchor !== q.anchor) return "Only old memories. Keep searching.";
    if (p.keys.includes(p.room)) return "You already carry this key.";
    p.keys.push(p.room);
    if (p.keys.length === this.order.length - 1) p.finishedAt = now;
    return "A key found. Another world unlocked.";
  }
  visit(id: string, owner: string) {
    const p = this.player(id);
    if (this.phase !== "FINALE") throw Error("Doors open in the finale.");
    if (owner) {
      const target = this.player(owner);
      if (
        owner === id ||
        !this.order.includes(owner) ||
        p.room ||
        !target.universe
      )
        throw Error("Invalid door.");
      const d = door(target.universe);
      if (Math.hypot(p.x - d.x, p.z - d.z, p.y) > 3)
        throw Error("Approach the correct universe door.");
    } else if (!p.room) throw Error("Already in the Atrium.");
    this.transition(p, owner);
  }
  finish(id: string, now: number) {
    if (this.phase === "FINISHED") return;
    this.winner = id;
    this.phase = "FINISHED";
    this.ended = now;
    this.deadline = 0;
    this.inputs.clear();
    for (const p of this.players) {
      p.speed = 0;
      p.motion = "idle";
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
    }
  }
  replay(id: string) {
    if (id !== this.host || this.phase !== "FINISHED")
      throw Error("Only the host can replay after results.");
    this.players = this.players.filter((p) => p.connected);
    this.phase = "WAITING";
    this.round = 0;
    this.deadline = 0;
    this.winner = "";
    this.outcome = "";
    this.overtime = false;
    this.started = 0;
    this.ended = 0;
    this.order = [];
    this.epoch = token();
    this.accumulator = 0;
    this.lastSimulation = 0;
    for (const map of [
      this.secrets,
      this.mechanisms,
      this.inputs,
      this.sequences,
      this.hiding,
      this.history,
      this.lastMove,
      this.movementCredit,
    ])
      map.clear();
    this.opened.clear();
    this.inspected.clear();
    this.players.forEach((p, i) => {
      p.keys = [];
      p.ready = false;
      p.universe = "";
      p.inspections = 0;
      p.finishedAt = 0;
      p.action = 0;
      this.transition(p, "");
      p.x = Math.sin((i * Math.PI * 2) / MAX_PLAYERS) * 6;
      p.z = Math.cos((i * Math.PI * 2) / MAX_PLAYERS) * 6;
    });
  }
  leave(id: string) {
    const p = this.player(id);
    this.inputs.delete(id);
    this.hiding.delete(id);
    if (this.phase === "WAITING")
      this.players = this.players.filter((p) => p.id !== id);
    else {
      p.connected = false;
      p.ready = true;
    }
    if (this.host === id)
      this.host = this.players.find((p) => p.connected)?.id || "";
  }
  view(id: string, now = Date.now()): Snapshot {
    const p = this.player(id),
      q = this.secrets.get(p.room),
      world = p.room ? this.player(p.room).universe : "",
      s = this.state(p);
    let clue = q?.clue || "";
    const elapsed =
      this.phase === "EXPLORATION"
        ? 1 - (this.deadline - now) / this.durations[1]
        : 0;
    if (q && world && p.room !== id) {
      if (elapsed > 0.4)
        clue +=
          " Area: " +
          (universe(world).anchors[q.anchor].z < 0
            ? "far half"
            : "entrance half") +
          ".";
      if (elapsed > 0.7) clue += " Mechanic: " + universe(world).hint;
      if (this.phase === "FINALE" && this.overtime)
        clue +=
          " Overtime: inspect " + universe(world).anchors[q.anchor].name + ".";
    }
    return {
      code: this.code,
      host: this.host,
      phase: this.phase,
      deadline: this.deadline,
      round: this.round,
      players: this.players.map((other) =>
        other.room && other.id !== id
          ? {
              ...other,
              x: 0,
              y: 0,
              z: 6,
              vx: 0,
              vy: 0,
              vz: 0,
              yaw: 0,
              speed: 0,
              motion: "idle" as const,
              action: 0,
            }
          : other,
      ),
      clue,
      owner: p.room,
      open: !!world && mechanismSolved(world, s),
      winner: this.winner,
      started: this.started,
      ended: this.ended,
      advanceAt: this.early,
      epoch: this.epoch,
      world,
      mechanism: { ...s },
      layout: q ? [...q.edits] : [],
      decoys: q ? [...q.decoys] : [],
      ...(this.phase === "PREPARATION" && p.room === id && q
        ? {
            workshop: {
              anchor: q.anchor,
              variant: q.variant,
              edits: [...q.edits],
              decoys: [...q.decoys],
            },
          }
        : {}),
      outcome: this.outcome,
      overtime: this.overtime,
    };
  }
}
