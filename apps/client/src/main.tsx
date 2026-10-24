import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  universe,
  objects,
} from "../../../packages/shared/src/universes";
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
import { avatarId, type Snapshot } from "../../../packages/shared/src/world";
import "./style.css";
import { Journey } from "./Journey";
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
const ignoreView = () => {};
function App() {
  const [showJourney, setShowJourney] = useState(!recovery() && !location.hash.includes("invite="));
  const [renderActive, setRenderActive] = useState(true);
  const [navigation, setNavigation] = useState(false);
  const [view, setView] = useState({ heading: 0, pitch: 0.32 });
  useEffect(() => {
    const update = () =>
      setRenderActive(!document.hidden && document.hasFocus());
    update();
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const [avatar, setAvatar] = useState(avatarId(saved("avatar", "soren")));
  const [quality, setQuality] = useState<Quality>(
    parseQuality(saved("quality", "MEDIUM")),
  );
  const [performance, setPerformance] = useState<PerformanceSample | null>(
    null,
  );
  const loading = useProgress();
  const [hideClue, setHideClue] = useState(false);
  const [target, setTarget] = useState("");
  const [prop, setProp] = useState(0),
    [slot, setSlot] = useState(0),
    [previewEdit, setPreviewEdit] = useState(false);
  const [room, setRoom] = useState<Connection | null>(null),
    [state, setState] = useState<Snapshot | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(
      new URLSearchParams(location.hash.slice(1)).get("invite") || "",
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
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
  useEffect(() => {
    if (state?.phase === "PREPARATION") setClue(state.clue);
    setPreviewEdit(false);
  }, [state?.epoch, state?.phase]);
  useEffect(() => {
    const update = () => {
      const invite = new URLSearchParams(location.hash.slice(1)).get("invite");
      if (invite && !room) {
        setCode(invite);
        history.replaceState(null, "", location.pathname);
      }
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [room]);
  const connect = async (create: boolean) => {
    setBusy(true);
    unlockAudio();
    try {
      const c = code.trim();
      const r = await admit(create, c, name, avatar);
      setCode(c);
      bind(r);
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const focused = state?.world
    ? objects(state.world).find((o) => o.id === target)
    : null;
  const interact = useCallback(
    (release = false) => {
      if (!room || !state || !target) return;
      if (
        state.phase === "PREPARATION" &&
        state.world &&
        objects(state.world).find((o) => o.id === target)?.anchor !== -1
      ) {
        room.send(release ? "place" : "hide", { object: target });
        return;
      }
      if (release) return;
      if (target.startsWith("door:")) {
        const owner = state.players.find((p) => p.universe === target.slice(5));
        if (owner) room.send("visit", { owner: owner.id });
        else setNotice("This universe is sealed for this match.");
      } else room.send("interact", { object: target });
    },
    [room, state, target],
  );
  const nearbyPrompt = focused
    ? state?.phase === "PREPARATION" && focused.anchor >= 0
      ? "Hold E · hide at " + focused.name
      : "E · " + focused.name
    : target === "portal"
      ? "E · unlock portal"
      : target.startsWith("door:")
        ? "E · " + universe(target.slice(5)).name
        : "Aim the reticle at an object";
  const renderState =
    state && previewEdit && state.workshop
      ? {
          ...state,
          layout: state.layout.map((value, i) => (i === prop ? slot : value)),
          workshop: { ...state.workshop, previewProp: prop },
        }
      : state;
  const remaining = Math.max(
    0,
    Math.ceil(((state?.advanceAt || state?.deadline || now) - now) / 1000),
  );
  if (showJourney && !room) return <Journey onEnter={() => setShowJourney(false)} />;
  return (
    <main
      data-render-active={renderActive}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        frameloop={!renderActive ? "never" : room ? "always" : "demand"}
        shadows={GRAPHICS[quality].shadows}
        camera={{
          position: [9.5, 5.2, 11.7],
          fov: 55,
          near: 0.1,
          far: GRAPHICS[quality].far,
        }}
        dpr={GRAPHICS[quality].dpr}
        gl={{
          // Context MSAA cannot be toggled after creation. Preset DPR supplies
          // supersampling without leaving LOW stuck with the initial MSAA cost.
          antialias: false,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        <World
          state={renderState}
          target={target}
          onTarget={setTarget}
          onView={navigation ? setView : ignoreView}
          room={room}
          interact={interact}
          quality={quality}
          onSample={setPerformance}
        />
      </Canvas>
      <Settings
        value={quality}
        onChange={setQuality}
        navigation={navigation}
        onNavigationChange={setNavigation}
      />
      {me && navigation && (
        <output
          className="navigation"
          aria-label="Navigation readout"
          data-x={me.x}
          data-y={me.y}
          data-z={me.z}
          data-heading={view.heading}
          data-camera-pitch={view.pitch}
        >
          Map E {me.x.toFixed(1)} / N {(-me.z).toFixed(1)} · {me.y.toFixed(1)} m
          · Heading {Math.round(view.heading)}°
        </output>
      )}
      {me && state?.owner && (
        <output className="elevation" aria-label="Elevation">
          {me.y.toFixed(1)} m ·{" "}
          {state.world === "sanctuary" ? "Space ↑ / C ↓" : "Space to jump"}
        </output>
      )}
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
            ? `${state.phase}${state.overtime ? " · OVERTIME" : ""}${state.advanceAt ? " · NEXT ROUND" : ""} ${state.phase === "EXPLORATION" ? ` · ROUND ${state.round}/${state.players.length - 1}` : ""}`
            : "A MULTIPLAYER MYSTERY"}{" "}
          <b>
            {state?.deadline
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : ""}
          </b>
        </div>
        <span className="edition">VOL. 01 / SIX UNIVERSES</span>
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
          <div className="eyebrow muted">2–6 PLAYERS · NO ACCOUNT NEEDED</div>
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
              <strong>
                {state?.players.length || 0}/{MAX_PLAYERS} PLAYERS
              </strong>
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
            <details className="invite-token">
              <summary>Manual invitation</summary>
              <input aria-label="Invite token" readOnly value={code} />
            </details>
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
                  state.host !== room.sessionId ||
                  state.players.length < MIN_PLAYERS
                }
                onClick={() => room.send("start")}
              >
                {state.host === room.sessionId
                  ? "Begin the match →"
                  : "Waiting for the host"}
              </button>
            </section>
          )}
          {room && (
            <div className="reticle" aria-hidden="true">
              +
            </div>
          )}
          {state?.phase === "PREPARATION" && (
            <section className="prepare">
              <div className="eyebrow gold">
                {universe(state.world).theme.toUpperCase()}
              </div>
              <h2>{universe(state.world).name}</h2>
              <p>
                Walk to a marked anchor. Aim, hold E for 0.6s and release to
                hide your key. Space jumps / ascends; C descends underwater.
              </p>
              <strong>
                Key:{" "}
                {
                  universe(state.world).anchors[state.workshop?.anchor || 0]
                    .name
                }
              </strong>
              <p>{nearbyPrompt}</p>
              <button
                disabled={!focused || focused.anchor < 0 || me?.ready}
                onPointerDown={() => interact()}
                onPointerUp={() => interact(true)}
              >
                Hold to hide key at the reticle
              </button>
              <label>
                MAIN MECHANISM
                <select
                  aria-label="MAIN MECHANISM"
                  disabled={me?.ready}
                  value={state.workshop?.variant || 0}
                  onChange={(e) =>
                    room.send("variant", { variant: Number(e.target.value) })
                  }
                >
                  <option value={0}>Standard initial state</option>
                  <option value={1}>Alternate initial state</option>
                </select>
              </label>
              <details>
                <summary>Approved room customization</summary>
                <output aria-label="Saved artifact positions">
                  {state.layout
                    .map((slot) => (slot ? "Far" : "Entrance"))
                    .join(" · ")}
                </output>
                <label>
                  ARTIFACT
                  <select
                    value={prop}
                    onChange={(e) => setProp(Number(e.target.value))}
                  >
                    {[0, 1, 2].map((i) => (
                      <option key={i} value={i}>
                        Artifact {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  SNAPPED POSITION
                  <select
                    aria-label="SNAPPED POSITION"
                  value={slot}
                    onChange={(e) => {
                      setSlot(Number(e.target.value));
                      setPreviewEdit(true);
                    }}
                  >
                    <option value={0}>Entrance display</option>
                    <option value={1}>Far display</option>
                  </select>
                </label>
                <button
                  disabled={me?.ready}
                  onClick={() => {
                    room.send("edit", { prop, slot });
                    setPreviewEdit(false);
                  }}
                >
                  Confirm position
                </button>
                <button className="quiet" onClick={() => setPreviewEdit(false)}>
                  Cancel preview
                </button>
                <button
                  className="quiet"
                  disabled={me?.ready}
                  onClick={() => room.send("undo")}
                >
                  Undo
                </button>
                <button
                  className="quiet"
                  disabled={me?.ready}
                  onClick={() => room.send("reset")}
                >
                  Reset world
                </button>
                <label>
                  DECOYS · UP TO TWO
                  <select
                    value=""
                    disabled={me?.ready}
                    onChange={(e) =>
                      room.send("decoy", { anchor: Number(e.target.value) })
                    }
                  >
                    <option value="" disabled>
                      Toggle a harmless decoy
                    </option>
                    {universe(state.world).anchors.map((a) => (
                      <option value={a.anchor} key={a.id}>
                        {state.decoys.includes(a.anchor)
                          ? "Remove: "
                          : "Place: "}
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
              <label>
                YOUR CLUE
                <textarea
                  aria-label="YOUR CLUE"
                  maxLength={180}
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                />
              </label>
              <button disabled={me?.ready} onClick={() => room.send("ready", { clue })}>
                {me?.ready ? "Universe sealed" : "Validate & seal universe →"}
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
                    ? universe(state.world).name
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
              <button className="interact" onClick={() => interact()}>
                <kbd>E</kbd> {nearbyPrompt}
              </button>
            </>
          )}
          {state?.phase === "FINISHED" && (
            <section className="results">
              <div className="eyebrow gold">
                {state.outcome === "draw"
                  ? "A MYSTERY SHARED"
                  : "THE PORTAL HAS CHOSEN"}
              </div>
              <h1>
                {state.winner
                  ? state.players.find((p) => p.id === state.winner)?.name
                  : "A shared mystery · draw"}
              </h1>
              <p>
                {state.outcome === "portal"
                  ? "Portal unlocked"
                  : state.outcome === "timeout"
                    ? "Clear key-count leader at overtime"
                    : "Tied progress after overtime"}{" "}
                · {Math.round((state.ended - state.started) / 1000)} seconds
              </p>
              {[...state.players]
                .sort((a, b) => b.keys.length - a.keys.length)
                .map((p) => (
                  <div className="score" key={p.id}>
                    <span>
                      {p.name}
                      <small>
                        {p.id === state.winner
                          ? state.outcome === "portal"
                            ? " · Portal Keeper"
                            : " · Key Leader"
                          : p.keys.length === state.players.length - 1
                            ? " · Master Seeker"
                            : p.inspections > 0
                              ? " · Explorer"
                              : " · Worldsmith"}
                      </small>
                    </span>
                    <b>
                      {p.keys.length} / {state.players.length - 1} keys ·{" "}
                      {p.inspections} discoveries
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
        <span>
          RIGHT MOUSE: LOOK · SHIFT: RUN · SPACE: JUMP / ASCEND · C: DESCEND ·
          R: RECENTER
        </span>
        <span>
          <kbd>E</kbd> INTERACT
        </span>
        <span className="footer-end">Every door hides a world.</span>
      </footer>
      {performance && (
        <output
          className="performance"
          aria-label="Frame performance"
          data-sampled-at={performance.sampledAt}
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
