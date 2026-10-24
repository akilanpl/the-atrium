import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { World, type PerformanceSample } from "./World";
import { AvatarSelect } from "./AvatarSelect";
import { Settings } from "./SettingsPanel";
import {
  GRAPHICS,
  quality as parseQuality,
  saved,
  type Quality,
} from "./settings";
import { unlockAudio } from "./audio";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { admit, resume, type Connection } from "./network";
import {
  ANCHORS,
  avatarId,
  OBJECTS,
  type Snapshot,
} from "../../../packages/shared/src/world";
import "./style.css";
function recovery() {
  try {
    return sessionStorage.getItem("atrium-resume");
  } catch {
    return null;
  }
}
function remember(value: string | null) {
  try {
    if (value && value !== recovery())
      sessionStorage.setItem("atrium-resume", value);
    else if (!value) sessionStorage.removeItem("atrium-resume");
  } catch {
    /* Play remains available without refresh recovery. */
  }
}
function App() {
  const [avatar, setAvatar] = useState(avatarId(saved("avatar", "soren")));
  const [quality, setQuality] = useState<Quality>(
    parseQuality(saved("quality", "MEDIUM")),
  );
  const [performance, setPerformance] = useState<PerformanceSample | null>(
    null,
  );
  const loading = useProgress();
  const [hideClue, setHideClue] = useState(false);
  const [room, setRoom] = useState<Connection | null>(null),
    [state, setState] = useState<Snapshot | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(
      new URLSearchParams(location.hash.slice(1)).get("invite") || "",
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [anchor, setAnchor] = useState(0),
    [secret, setSecret] = useState(true),
    [clue, setClue] = useState("Time keeps more than hours."),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const i = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(i);
  }, [notice]);
  const me = state?.players.find((p) => p.id === room?.sessionId);
  const bind = (r: Connection) => {
    r.onMessage("invite", (invite: string) => setCode(invite));
    r.onMessage("snapshot", (s: Snapshot) => {
      setState(s);
      if (r.reconnectionToken) remember(r.reconnectionToken);
    });
    r.onMessage("notice", setNotice);
    r.onLeave(() => {
      remember(null);
      setRoom(null);
      setState(null);
      setNotice("Disconnected. Create or join a new lobby.");
    });
    r.onError((_, message) => setNotice(message || "Connection error"));
    r.reconnection.maxEnqueuedMessages = 0;
    r.reconnection.minUptime = 0;
    r.onDrop(() => setNotice("Connection interrupted. Recovering your seat…"));
    r.onReconnect(() => setNotice("Your seat was restored."));
    remember(r.reconnectionToken);
    setRoom(r);
  };
  useEffect(() => {
    history.replaceState(null, "", location.pathname);
    const credential = recovery();
    if (!credential) return;
    setBusy(true);
    resume(credential)
      .then(bind)
      .catch((e: Error) => {
        remember(null);
        setNotice(e.message);
      })
      .finally(() => setBusy(false));
  }, []);
  const connect = async (create: boolean) => {
    setBusy(true);
    unlockAudio();
    try {
      const c = code.trim();
      const r = await admit(create, c, name, avatar);
      bind(r);
      setCode(c);
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const interact = useCallback(() => {
    if (!room || !state) return;
    const p = state.players.find((p) => p.id === room.sessionId)!;
    if (p.room) {
      const nearest = [...OBJECTS]
        .filter((o) => o.id !== "compartment" || state.open)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0];
      room.send("interact", { object: nearest.id });
    } else if (state.phase === "FINALE") {
      if (Math.hypot(p.x, p.z) < 2.8)
        room.send("interact", { object: "portal" });
      else {
        const i = state.players.findIndex(
          (_, i) =>
            Math.hypot(
              p.x - Math.sin((i * Math.PI) / 2) * 10,
              p.z + Math.cos((i * Math.PI) / 2) * 10,
            ) < 3,
        );
        if (i >= 0) room.send("visit", { owner: state.players[i].id });
        else setNotice("Approach the portal or a rival’s door.");
      }
    } else setNotice("The host can begin when everyone has arrived.");
  }, [room, state]);
  const nearest =
    me && state?.owner
      ? [...OBJECTS]
          .filter((o) => o.id !== "compartment" || state.open)
          .sort(
            (a, b) =>
              Math.hypot(a.x - me.x, a.z - me.z) -
              Math.hypot(b.x - me.x, b.z - me.z),
          )[0]
      : null;
  const labels: Record<string, string> = {
    clock: "Inspect the grandfather clock",
    desk: "Search the librarian’s desk",
    book: "Examine the hollow atlas",
    statue: "Inspect the explorer’s monument",
    trigger: "Pull the unfinished volume",
    compartment: "Open the hidden compartment",
    "book-east": "Read the eastern volumes",
    "book-eastmost": "Read the bound chronicles",
  };
  const nearbyPrompt =
    nearest && me && Math.hypot(nearest.x - me.x, nearest.z - me.z) <= 2.8
      ? labels[nearest.id]
      : "Approach an object to inspect";
  const remaining = Math.max(
    0,
    Math.ceil(((state?.deadline || now) - now) / 1000),
  );
  return (
    <main onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows={GRAPHICS[quality].shadows}
        camera={{
          position: [9.5, 5.2, 11.7],
          fov: 55,
          near: 0.1,
          far: GRAPHICS[quality].far,
        }}
        dpr={GRAPHICS[quality].dpr}
        gl={{
          antialias: quality !== "LOW",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        <World
          state={state}
          room={room}
          interact={interact}
          quality={quality}
          onSample={setPerformance}
        />
      </Canvas>
      <Settings value={quality} onChange={setQuality} />
      {loading.active && (
        <div className="asset-progress" role="status">
          Preparing the palace · {Math.round(loading.progress)}%
        </div>
      )}
      <header>
        <a className="brand" href="/">
          ◈ <span>THE ATRIUM</span>
        </a>
        <div className="eyebrow">
          {state
            ? `${state.phase} ${state.phase === "EXPLORATION" ? ` · ROUND ${state.round}/${state.players.length - 1}` : ""}`
            : "A MULTIPLAYER MYSTERY"}{" "}
          <b>
            {state?.deadline
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : ""}
          </b>
        </div>
        <span className="edition">VOL. 01 / CLOCKWORK LIBRARY</span>
      </header>
      {!room && <AvatarSelect value={avatar} onChange={setAvatar} />}
      {!room ? (
        <section className="landing">
          <div className="eyebrow gold">EVERY WORLD HIDES A KEY</div>
          <h1>
            Some doors
            <br />
            change <i>everything.</i>
          </h1>
          <p>
            A gathering of strangers. A library of secrets.
            <br />
            Hide your key. Decipher theirs. Claim the portal.
          </p>
          <div className="entry">
            <label>
              YOUR NAME
              <input
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a nickname"
              />
            </label>
            <button disabled={busy} onClick={() => connect(true)}>
              Create a private lobby <span>↗</span>
            </button>
            <div className="join">
              <input
                aria-label="Room code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PRIVATE INVITE"
                maxLength={64}
              />
              <button disabled={busy} onClick={() => connect(false)}>
                Join →
              </button>
            </div>
          </div>
          <div className="eyebrow muted">2–4 PLAYERS · NO ACCOUNT NEEDED</div>
          <details className="privacy-notice">
            <summary>Privacy & community rules</summary>
            <p>
              Use a nickname, never personal details. Names and clues are
              visible to players in your private lobby. Be respectful: no
              harassment or personal information. Hosts can kick; clues can be
              hidden and reported. Reports stay in this lobby for up to 10
              minutes. No account, chat or analytics. Live rooms expire within
              one hour; invite links expire after 30 minutes. Closing the tab
              clears its recovery credential; refresh can restore a seat within
              a 20 second disconnect grace. Browser preferences remain until
              cleared. This preview is intended for adults (18+). Contact and
              jurisdiction review are required before public beta.
            </p>
            <button
              className="quiet"
              onClick={() => {
                for (const key of [
                  "avatar",
                  "quality",
                  "volume",
                  "effects",
                  "mute",
                ])
                  localStorage.removeItem("atrium:" + key);
                remember(null);
                setNotice(
                  "Saved preferences and this tab’s recovery credential cleared.",
                );
              }}
            >
              Clear saved preferences and recovery
            </button>
          </details>
        </section>
      ) : (
        <>
          <aside className="roster">
            <div className="eyebrow">
              PRIVATE LOBBY{" "}
              <strong>{state?.players.length || 0}/4 PLAYERS</strong>
            </div>
            <button
              className="quiet"
              onClick={() =>
                navigator.clipboard
                  .writeText(
                    `${location.origin}${location.pathname}#invite=${code}`,
                  )
                  .then(() => setNotice("Invite link copied."))
                  .catch(() => setNotice(`Share this code: ${code}`))
              }
            >
              Copy invite link ↗
            </button>
            {state?.host === room.sessionId && (
              <>
                <button
                  className="quiet"
                  onClick={() => room.send("rotateInvite")}
                >
                  Replace invite
                </button>
                <button className="quiet" onClick={() => room.send("lock")}>
                  Toggle join lock
                </button>
              </>
            )}
            <button className="quiet" onClick={() => room.leave()}>
              Leave lobby
            </button>
            {state?.players.map((p, i) => (
              <div className="player" key={p.id}>
                <span
                  className="dot"
                  style={{ background: i ? "#6bafb5" : "#caa86a" }}
                />
                {p.name}
                <small>
                  {p.id === state.host
                    ? "HOST"
                    : p.connected
                      ? "ONLINE"
                      : "AWAY"}
                </small>
                <b>{p.keys.length} ◈</b>
                {p.id !== room.sessionId && (
                  <button
                    className="quiet"
                    onClick={() =>
                      room.send("report", { id: p.id, reason: "name" })
                    }
                  >
                    Report
                  </button>
                )}
                {state.host === room.sessionId && p.id !== room.sessionId && (
                  <button
                    className="quiet"
                    onClick={() => room.send("kick", { id: p.id })}
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </aside>
          {state?.phase === "WAITING" && (
            <section className="bottompanel">
              <div>
                <div className="eyebrow gold">THE GATHERING</div>
                <h2>The doors are waiting.</h2>
                <p>
                  Share your private invite with a friend. Explore the atrium
                  while they arrive.
                </p>
              </div>
              <button
                disabled={
                  state.host !== room.sessionId || state.players.length < 2
                }
                onClick={() => room.send("start")}
              >
                {state.host === room.sessionId
                  ? "Begin the match →"
                  : "Waiting for the host"}
              </button>
            </section>
          )}
          {state?.phase === "PREPARATION" && (
            <section className="prepare">
              <div className="eyebrow gold">YOUR CLOCKWORK LIBRARY</div>
              <h2>Leave a little mystery.</h2>
              <p>
                Choose where your key waits. A clue is your only message to
                visitors.
              </p>
              <label>
                HIDING PLACE
                <select
                  value={anchor}
                  onChange={(e) => setAnchor(Number(e.target.value))}
                >
                  {ANCHORS.map((a, i) => (
                    <option value={i} key={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={secret || anchor === 4}
                  disabled={anchor === 4}
                  onChange={(e) => setSecret(e.target.checked)}
                />{" "}
                Enable the hidden bookshelf
              </label>
              <label>
                YOUR CLUE
                <textarea
                  maxLength={180}
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                />
              </label>
              <button
                onClick={() => room.send("ready", { anchor, secret, clue })}
              >
                {me?.ready
                  ? "Room ready · update settings"
                  : "Seal your secret →"}
              </button>
              <small>
                All rooms ready advances immediately. Defaults apply at timeout.
              </small>
            </section>
          )}
          {(state?.phase === "EXPLORATION" || state?.phase === "FINALE") && (
            <>
              <div className="objective">
                <div className="eyebrow gold">
                  {state.owner
                    ? `${state.players.find((p) => p.id === state.owner)?.name}’S UNIVERSE`
                    : "THE FINAL SCRAMBLE"}
                </div>
                <h2>
                  {state.owner
                    ? "The Clockwork Library"
                    : "All keys lead home."}
                </h2>
                <p>
                  {state.owner
                    ? hideClue
                      ? "Clue hidden on this device."
                      : `“${state.clue}”`
                    : "Collect every rival key, then approach the central portal and press E. Missing a key? Enter its owner’s door."}
                </p>
                {state.owner && (
                  <>
                    <button
                      className="quiet"
                      onClick={() => setHideClue(!hideClue)}
                    >
                      {hideClue ? "Show clue" : "Hide clue"}
                    </button>
                    <button
                      className="quiet"
                      onClick={() =>
                        room.send("report", { id: state.owner, reason: "clue" })
                      }
                    >
                      Report clue to host
                    </button>
                  </>
                )}
                {state.owner && state.phase === "FINALE" && (
                  <button
                    className="quiet"
                    onClick={() => room.send("visit", { owner: "" })}
                  >
                    Return to atrium ↩
                  </button>
                )}
              </div>
              <div className="inventory">
                {state.players
                  .filter((p) => p.id !== room.sessionId)
                  .map((p) => (
                    <span
                      key={p.id}
                      className={me?.keys.includes(p.id) ? "found" : ""}
                    >
                      ◈ {p.name}
                    </span>
                  ))}
              </div>
              <button className="interact" onClick={interact}>
                <kbd>E</kbd>{" "}
                {state.owner ? nearbyPrompt : "Enter door / unlock portal"}
              </button>
            </>
          )}
          {state?.phase === "FINISHED" && (
            <section className="results">
              <div className="eyebrow gold">THE PORTAL HAS CHOSEN</div>
              <h1>{state.players.find((p) => p.id === state.winner)?.name}</h1>
              <p>
                Winner of the Atrium ·{" "}
                {Math.round((state.ended - state.started) / 1000)} seconds
              </p>
              {[...state.players]
                .sort((a, b) => b.keys.length - a.keys.length)
                .map((p) => (
                  <div className="score" key={p.id}>
                    <span>{p.name}</span>
                    <b>
                      {p.keys.length} / {state.players.length - 1} keys
                    </b>
                  </div>
                ))}
              {state.host === room.sessionId ? (
                <button onClick={() => room.send("replay")}>
                  Open the doors again →
                </button>
              ) : (
                <p>Waiting for the host to replay.</p>
              )}
            </section>
          )}
        </>
      )}
      <footer>
        <span>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> MOVE
        </span>
        <span>RIGHT MOUSE: LOOK · SHIFT: RUN · SCROLL: ZOOM · R: RECENTER</span>
        <span>
          <kbd>E</kbd> INTERACT
        </span>
        <span className="footer-end">Every door hides a world.</span>
      </footer>
      {performance && (
        <output
          className="performance"
          aria-label="Frame performance"
          data-fps={performance.fps}
          data-frame-ms={performance.frameMs}
          data-p95={performance.p95}
          data-calls={performance.calls}
          data-triangles={performance.triangles}
        >
          {performance.fps} FPS · {quality}
        </output>
      )}
      {notice && (
        <div
          role="status"
          className={
            notice.startsWith("A key found") ? "toast key-discovery" : "toast"
          }
        >
          {notice}
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
