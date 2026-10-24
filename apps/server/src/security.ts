import { randomBytes } from "node:crypto";
export const token = () => randomBytes(32).toString("base64url");
export function text(value: unknown, max: number) {
  if (typeof value !== "string") throw Error("Invalid text.");
  const s = value.normalize("NFKC").trim();
  if (!s || s.length > max || /[<>\p{Cc}\p{Cf}]/u.test(s))
    throw Error("Use plain text within the length limit.");
  return s;
}
export function shape(value: unknown, fields: string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !fields.includes(k)) ||
    fields.some((k) => !(k in value))
  )
    throw Error("Invalid message.");
}
export function validate(type: string | number, data: any) {
  switch (type) {
    case "start":
    case "replay":
    case "rotateInvite":
    case "lock":
      if (data !== undefined && data !== null) throw Error("Invalid message.");
      return;
    case "ready":
      shape(data, ["anchor", "secret", "clue"]);
      if (
        !Number.isInteger(data.anchor) ||
        data.anchor < 0 ||
        data.anchor > 4 ||
        typeof data.secret !== "boolean"
      )
        throw Error("Invalid settings.");
      data.clue = text(data.clue, 180);
      return;
    case "move":
      shape(data, ["x", "z", "yaw"]);
      if (
        ![data.x, data.z, data.yaw].every(Number.isFinite) ||
        Math.abs(data.x) > 12 ||
        Math.abs(data.z) > 12 ||
        Math.abs(data.yaw) > Math.PI * 4
      )
        throw Error("Invalid movement.");
      return;
    case "interact":
      shape(data, ["object"]);
      text(data.object, 32);
      return;
    case "visit":
      shape(data, ["owner"]);
      if (typeof data.owner !== "string" || data.owner.length > 64)
        throw Error("Invalid destination.");
      return;
    case "report":
      shape(data, ["id", "reason"]);
      text(data.id, 64);
      if (!["name", "clue", "behavior"].includes(data.reason))
        throw Error("Invalid reason.");
      return;
    case "kick":
      shape(data, ["id"]);
      text(data.id, 64);
      return;
    default:
      throw Error("Unsupported message.");
  }
}
export class Limiter {
  entries = new Map<string, { count: number; until: number }>();
  constructor(
    public limit: number,
    public window = 60000,
    public capacity = 4096,
  ) {}
  take(key: string, now = Date.now()) {
    this.sweep(now);
    let row = this.entries.get(key);
    if (!row) {
      if (this.entries.size >= this.capacity) return false;
      row = { count: 0, until: now + this.window };
      this.entries.set(key, row);
    }
    return ++row.count <= this.limit;
  }
  sweep(now = Date.now()) {
    for (const [k, v] of this.entries)
      if (v.until <= now) this.entries.delete(k);
  }
}
