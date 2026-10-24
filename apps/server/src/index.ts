import { MAX_PLAYERS } from "../../../packages/shared/src/universes.js";
import express from "express";
import { createServer } from "node:http";
import { Server, Room, matchMaker, type Client } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Game } from "./game.js";
import { Limiter, token, text, shape, validate } from "./security.js";
if (
  process.env.NODE_ENV &&
  !["production", "development", "test"].includes(process.env.NODE_ENV)
)
  throw Error("Unsupported NODE_ENV. Staging must use production mode.");
const production = process.env.NODE_ENV === "production";
const origins = (
  process.env.ALLOWED_ORIGINS ||
  (production ? "" : "http://localhost:5173,http://127.0.0.1:5173")
)
  .split(",")
  .filter(Boolean);
if (
  !origins.length ||
  origins.some((o) => {
    try {
      const u = new URL(o);
      return u.origin !== o || (production && u.protocol !== "https:");
    } catch {
      return true;
    }
  })
)
  throw Error("Configure exact ALLOWED_ORIGINS.");
if (production && (process.env.FAST_MODE || process.env.TLS_PROXY !== "1"))
  throw Error("Production requires TLS_PROXY=1 and normal timers.");
const duration = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (production) throw Error("Custom round timers are for non-production tests only.");
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1000 || n > 300000)
    throw Error("Invalid round duration.");
  return n;
};
const configuredDurations = [
  duration("PREPARATION_MS", 120000),
  duration("EXPLORATION_MS", 90000),
  duration("FINALE_MS", 90000),
];
const creationKey = token();
const ingress = new Limiter(40),
  upgrades = new Limiter(30);
const invites = new Map<string, { room: string; expires: number }>();
const rooms = new Map<string, AtriumRoom>();
let draining = false;
const metrics = { denied: 0, invalidMessages: 0, floods: 0 };
class AtriumRoom extends Room {
  game!: Game;
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = 80;
  actionLimiter = new Limiter(8, 1000, 8);
  lockedJoins = false;
  invite = "";
  reports: { by: string; target: string; reason: string; expires: number }[] =
    [];
  grants = new Set<string>();
  messageLimiter = new Limiter(70, 1000, 8);
  async onCreate(options: any) {
    if (options.creationKey !== creationKey || rooms.size >= 100)
      throw Error("Unavailable.");
    rooms.set(this.roomId, this);
    await this.setPrivate(true);
    this.seatReservationTimeout = 10;
    this.game = new Game(
      "",
      process.env.FAST_MODE === "1" ? [1500, 2500, 5000] : configuredDurations,
    );
    this.rotate();
    this.clock.setTimeout(() => this.disconnect(), 60 * 60 * 1000);
    this.onMessage("*", (client, type, data) => {
      if (
        !this.messageLimiter.take(client.sessionId) ||
        (type !== "input" && !this.actionLimiter.take(client.sessionId))
      ) {
        metrics.floods++;
        client.leave(4408);
        return;
      }
      try {
        validate(type, data);
        const id = client.sessionId;
        if (!this.game.player(id).connected) throw Error("Unavailable.");
        switch (type) {
          case "start":
            this.game.start(id);
            break;
          case "ready":
            this.game.configure(id, data);
            break;
          case "input":
            this.game.setInput(id, data);
            break;
          case "hide":
          case "place":
            client.send(
              "notice",
              this.game.hide(id, data.object, type === "place"),
            );
            break;
          case "edit":
          case "variant":
          case "decoy":
          case "undo":
          case "reset":
            this.game.edit(id, String(type), data);
            client.send("notice", "Room edit applied.");
            break;
          case "interact":
            client.send("notice", this.game.interact(id, data.object));
            break;
          case "visit":
            this.game.visit(id, data.owner);
            break;
          case "replay":
            this.game.replay(id);
            break;
          case "report":
            this.game.player(data.id);
            this.reports = this.reports.filter((r) => r.expires > Date.now());
            if (
              this.reports.length >= 32 ||
              this.reports.some(
                (r) =>
                  r.by === id &&
                  r.target === data.id &&
                  r.reason === data.reason,
              )
            )
              throw Error("Report limit.");
            this.reports.push({
              by: id,
              target: data.id,
              reason: data.reason,
              expires: Date.now() + 600000,
            });
            client.send(
              "notice",
              "Report received for this lobby. Hide the clue or leave if you feel uncomfortable.",
            );
            this.clients
              .find((c) => c.sessionId === this.game.host)
              ?.send(
                "notice",
                "A participant reported " +
                  data.reason +
                  ". Review the lobby and use kick if needed.",
              );
            break;
          case "rotateInvite":
          case "lock":
          case "kick":
            if (id !== this.game.host) throw Error("Host only.");
            if (type === "rotateInvite") {
              this.rotate();
              client.send("invite", this.invite);
            }
            if (type === "lock") {
              this.lockedJoins = !this.lockedJoins;
              client.send(
                "notice",
                this.lockedJoins ? "Joins locked." : "Joins unlocked.",
              );
            }
            if (type === "kick") {
              if (data.id === id) throw Error("Invalid target.");
              const target = this.clients.find((c) => c.sessionId === data.id);
              if (!target) throw Error("Invalid target.");
              target.leave(4403);
              this.rotate();
              client.send("invite", this.invite);
            }
            break;
        }
      } catch {
        metrics.invalidMessages++;
        client.send("notice", "Action unavailable or invalid.");
      }
    });
    let snapshotTick = 0;
    this.setSimulationInterval(() => {
      this.game.tick();
      if (++snapshotTick % 2) return;
      this.reports = this.reports.filter((r) => r.expires > Date.now());
      for (const c of this.clients) {
        const raw = (c as any).ref;
        if (raw?.bufferedAmount > 65536) {
          c.leave(4008);
          continue;
        }
        c.send("snapshot", this.game.view(c.sessionId));
      }
    }, 50);
  }
  rotate() {
    if (this.invite) invites.delete(this.invite);
    this.invite = token();
    invites.set(this.invite, {
      room: this.roomId,
      expires:
        Date.now() +
        (process.env.NODE_ENV === "test"
          ? Number(process.env.TEST_INVITE_TTL_MS || 1800000)
          : 1800000),
    });
  }
  static async onAuth(_token: string, options: any) {
    if (options.admissionKey !== creationKey) throw Error("Admission denied.");
    return { sessionId: token() };
  }
  onJoin(client: Client, options: any) {
    if (!this.grants.delete(options.ticket)) throw Error("Admission denied.");
    client.reconnectionToken = token();
    this.game.add(client.sessionId, options.name, options.avatar);
    client.send("snapshot", this.game.view(client.sessionId));
    if (this.game.host === client.sessionId) client.send("invite", this.invite);
  }
  async onDrop(client: Client, code: number) {
    if (code >= 4000) return;
    this.game.player(client.sessionId).connected = false;
    try {
      await this.allowReconnection(client, 20);
    } catch {
      /* Grace expired; Colyseus invokes onLeave. */
    }
  }
  onReconnect(client: Client) {
    this.game.sequences.delete(client.sessionId);
    this.game.inputs.delete(client.sessionId);
    client.reconnectionToken = token();
    this.game.player(client.sessionId).connected = true;
    client.send("snapshot", this.game.view(client.sessionId));
    if (client.sessionId === this.game.host) client.send("invite", this.invite);
  }
  onLeave(client: Client) {
    this.game.leave(client.sessionId);
    this.clients
      .find((c) => c.sessionId === this.game.host)
      ?.send("invite", this.invite);
  }
  onDispose() {
    rooms.delete(this.roomId);
    invites.delete(this.invite);
    this.grants.clear();
    this.reports = [];
    this.game.secrets.clear();
    this.game.opened.clear();
    this.game.mechanisms.clear();
    this.game.inputs.clear();
    this.game.history.clear();
    this.game.hiding.clear();
  }
}
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", false);
app.use(express.json({ limit: "2kb", strict: true }));
app.get("/health", (_, res) =>
  res.status(draining ? 503 : 200).json({ ok: !draining }),
);
app.get("/ready", (_, res) =>
  res.status(draining ? 503 : 200).json({
    ok: !draining,
    ...(process.env.NODE_ENV === "test"
      ? { rss: process.memoryUsage().rss }
      : {}),
  }),
);
app.post("/api/admit", async (req, res) => {
  try {
    shape(req.body, ["create", "invite", "name", "avatar"]);
    const { create, invite, avatar } = req.body;
    const name = text(req.body.name, 20);
    if (
      typeof create !== "boolean" ||
      typeof invite !== "string" ||
      invite.length > 64 ||
      !["soren", "mara"].includes(avatar) ||
      draining
    )
      throw Error();
    let room: AtriumRoom;
    let reservation;
    const ticket = token();
    const authContext = {
      token: "",
      headers: new Headers(),
      ip: req.socket.remoteAddress || "unknown",
    };
    if (create) {
      if (rooms.size >= 100) throw Error();
      reservation = await matchMaker.create(
        "atrium",
        {
          creationKey,
          admissionKey: creationKey,
          ticket,
          name,
          avatar,
        },
        authContext,
      );
      room = rooms.get(reservation.roomId)!;
    } else {
      const entry = invites.get(invite);
      if (!entry || entry.expires < Date.now()) throw Error();
      room = rooms.get(entry.room)!;
      if (!room || room.lockedJoins || room.game.phase !== "WAITING")
        throw Error();
      reservation = await matchMaker.joinById(
        entry.room,
        {
          ticket,
          admissionKey: creationKey,
          name,
          avatar,
        },
        authContext,
      );
    }
    room.grants.add(ticket);
    room.clock.setTimeout(() => room.grants.delete(ticket), 10000);
    res.setHeader("Cache-Control", "no-store");
    res.json(reservation);
  } catch {
    metrics.denied++;
    res.status(403).json({ error: "Lobby unavailable or invalid admission." });
  }
});
app.post("/api/reconnect", async (req, res) => {
  try {
    shape(req.body, ["credential"]);
    const credential = req.body.credential;
    if (typeof credential !== "string" || credential.length > 128 || draining)
      throw Error();
    const parts = credential.split(":");
    if (
      parts.length !== 2 ||
      !parts.every((p: string) => /^[a-zA-Z0-9_-]+$/.test(p))
    )
      throw Error();
    const reservation = await matchMaker.reconnect(parts[0], {
      reconnectionToken: parts[1],
    });
    res.json({ ...reservation, reconnectionToken: parts[1] });
  } catch {
    metrics.denied++;
    res.status(403).json({ error: "Session unavailable." });
  }
});
app.use((_req, res) => res.status(404).json({ error: "Not found." }));
app.use((_err: any, _req: any, res: any, _next: any) =>
  res.status(400).json({ error: "Invalid request." }),
);
const http = createServer(app);
const server = new Server({
  greet: false,
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => console.warn('{"event":"transport_warning"}'),
    error: () => console.error('{"event":"transport_error"}'),
  },
  transport: new WebSocketTransport({
    server: http,
    maxPayload: 2048,
    perMessageDeflate: false,
    pingInterval: 10000,
    pingMaxRetries: 2,
    verifyClient: (info, done) =>
      done(
        origins.includes(info.origin) &&
          upgrades.take(info.req.socket.remoteAddress || "unknown"),
        403,
        "Forbidden",
      ),
  }),
});
server.define("atrium", AtriumRoom);
await server.listen(Number(process.env.PORT || 2567), "127.0.0.1");
// Colyseus installs its own HTTP listener: guard the combined handler, including matchmaking.
const handlers = http.listeners("request");
http.removeAllListeners("request");
http.on("request", (req, res) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (production)
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  const origin = req.headers.origin;
  if (origin && origins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  }
  if (origin && !origins.includes(origin)) {
    res.writeHead(403).end();
    return;
  }
  if (
    !["/api/admit", "/api/reconnect", "/health", "/ready"].includes(
      req.url?.split("?")[0] || "",
    ) ||
    (req.method === "POST" && !origin) ||
    !ingress.take(req.socket.remoteAddress || "unknown")
  ) {
    res.writeHead(403).end();
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  for (const handler of handlers) handler.call(http, req, res);
});
http.requestTimeout = 10000;
http.headersTimeout = 15000;
http.maxConnections = 512;
const telemetry = setInterval(
  () =>
    console.log(
      JSON.stringify({
        event: "metrics",
        rooms: rooms.size,
        invites: invites.size,
        rss: process.memoryUsage().rss,
        ...metrics,
      }),
    ),
  60000,
);
telemetry.unref();
const sweep = setInterval(() => {
  for (const [key, v] of invites)
    if (v.expires <= Date.now()) invites.delete(key);
  ingress.sweep();
  upgrades.sweep();
}, 30000);
sweep.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    draining = true;
    clearInterval(sweep);
    clearInterval(telemetry);
    void server.gracefullyShutdown().then(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });

console.log(
  JSON.stringify({
    event: "listening",
    port: Number(process.env.PORT || 2567),
  }),
);
