import { Client, type Room } from "@colyseus/sdk";
const endpoint =
  import.meta.env?.VITE_SERVER_URL ||
  (import.meta.env.PROD
    ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    : `ws://${location.hostname}:2567`);
if (import.meta.env.PROD && !endpoint.startsWith("wss://"))
  throw Error("Production requires WSS.");
export const client = new Client(endpoint);
export type Connection = Room;

export async function admit(
  create: boolean,
  invite: string,
  name: string,
  avatar: string,
) {
  const response = await fetch(endpoint.replace(/^ws/, "http") + "/api/admit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ create, invite, name, avatar }),
  });
  if (!response.ok)
    throw Error("Lobby unavailable. Check the invite or ask the host.");
  return client.consumeSeatReservation(await response.json());
}

export async function resume(credential: string) {
  const response = await fetch(
    endpoint.replace(/^ws/, "http") + "/api/reconnect",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    },
  );
  if (!response.ok)
    throw Error("Your seat expired. Ask the host for a new invite.");
  return client.consumeSeatReservation(await response.json());
}
