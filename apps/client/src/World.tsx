import { lazy, Suspense, useEffect, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import type { Snapshot } from "../../../packages/shared/src/world";
import { Controls, type Motor } from "./Controls";
import { Character } from "./Character";
import type { Connection } from "./network";
import { Label } from "./Label";
import { AssetGuard, usePalette } from "./Assets";
import Atrium from "./environments/Atrium";
import { Dust } from "./environments/Architecture";
import { GRAPHICS, reducedMotion, type Quality } from "./settings";
import { ambienceFor, sound } from "./audio";
const Library = lazy(() => import("./environments/Library"));
export interface PerformanceSample {
  fps: number;
  frameMs: number;
  p95: number;
  calls: number;
  triangles: number;
}
function Measurement({
  onSample,
}: {
  onSample: (p: PerformanceSample) => void;
}) {
  const frames = useRef<number[]>([]),
    elapsed = useRef(0);
  useFrame(({ gl }, dt) => {
    if (document.hidden) {
      frames.current = [];
      elapsed.current = 0;
      return;
    }
    if (dt < 0.2) frames.current.push(dt * 1000);
    elapsed.current += dt;
    if (elapsed.current > 3 && frames.current.length > 20) {
      const a = frames.current.sort((x, y) => x - y);
      const mean = a.reduce((s, x) => s + x, 0) / a.length;
      onSample({
        fps: Math.round(1000 / mean),
        frameMs: +mean.toFixed(1),
        p95: +a[Math.floor(a.length * 0.95)].toFixed(1),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      });
      frames.current = [];
      elapsed.current = 0;
    }
  });
  return null;
}
function Soundscape({
  state,
  motor,
  playerId,
}: {
  state: Snapshot | null;
  motor: React.RefObject<Motor>;
  playerId?: string;
}) {
  const distance = useRef(0),
    keys = useRef(0),
    phase = useRef(""),
    lastOpen = useRef(false),
    tick = useRef(0);
  const me = state?.players.find((p) => p.id === playerId);
  useEffect(() => {
    void ambienceFor(!!state?.owner);
  }, [state?.owner]);
  useEffect(() => {
    const count = me?.keys.length || 0;
    if (count > keys.current) void sound("key");
    keys.current = count;
    if (state?.open && !lastOpen.current) void sound("mechanism", 0.6);
    lastOpen.current = !!state?.open;
    if (state?.phase !== phase.current) {
      if (state?.phase === "FINISHED") void sound("victory");
      else if (state?.phase === "FINALE") void sound("portal");
      else if (state?.phase === "EXPLORATION") void sound("door");
      phase.current = state?.phase || "";
    }
  }, [me?.keys.length, state?.open, state?.phase]);
  useFrame((_, dt) => {
    if (!state) return;
    distance.current += motor.current.speed * dt;
    if (distance.current > (motor.current.speed > 2.6 ? 0.76 : 0.79)) {
      distance.current = 0;
      void sound(state.owner ? "wood" : "stone", 0.3);
    }
    const seconds = Math.ceil((state.deadline - Date.now()) / 1000);
    if (seconds > 0 && seconds <= 5 && tick.current !== seconds) {
      tick.current = seconds;
      void sound("tick", 0.5);
    }
  });
  return null;
}
function Decoration({
  state,
  room,
  quality,
}: {
  state: Snapshot | null;
  room: Connection | null;
  quality: Quality;
}) {
  const palette = usePalette();
  return (
    <>
      {state?.owner ? (
        <Library palette={palette} open={!!state.open} />
      ) : (
        <Atrium palette={palette} state={state} playerId={room?.sessionId} />
      )}
      <Dust
        count={GRAPHICS[quality].particles}
        library={!!state?.owner}
        reduced={reducedMotion()}
      />
    </>
  );
}
const decorationSignature = (s: Snapshot | null) =>
  s
    ? [
        s.owner,
        s.phase,
        s.open,
        s.players.map((p) => `${p.id}:${p.name}:${p.keys.length}`).join("|"),
      ].join(":")
    : "landing";
const Decor = memo(
  Decoration,
  (a, b) =>
    a.quality === b.quality &&
    a.room === b.room &&
    decorationSignature(a.state) === decorationSignature(b.state),
);
export function World({
  state,
  room,
  interact,
  quality,
  onSample,
}: {
  state: Snapshot | null;
  room: Connection | null;
  interact: () => void;
  quality: Quality;
  onSample: (p: PerformanceSample) => void;
}) {
  const motor = useRef<Motor>({ x: 0, z: 6, yaw: 0, speed: 0, moving: false });
  const preset = GRAPHICS[quality];
  return (
    <>
      <Controls state={state} room={room} interact={interact} motor={motor} />
      <Measurement onSample={onSample} />
      <Soundscape state={state} motor={motor} playerId={room?.sessionId} />
      <color attach="background" args={["#10181d"]} />
      <fog
        attach="fog"
        args={["#18232a", state?.owner ? 14 : 28, preset.far]}
      />
      <ambientLight intensity={state?.owner ? 0.35 : 0.22} />
      <hemisphereLight
        args={["#a8bdc9", "#4a3225", state?.owner ? 0.75 : 0.55]}
      />
      <directionalLight
        key={quality}
        position={state?.owner ? [4, 6.5, 7] : [4, 11, 7]}
        color="#ffe5bc"
        intensity={2.2}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowSize, preset.shadowSize]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={17}
        shadow-camera-bottom={-17}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <AssetGuard>
        <Suspense fallback={null}>
          {preset.ibl && (
            <Environment
              files="/assets/materials/palace.hdr"
              environmentIntensity={0.26}
            />
          )}
        </Suspense>
      </AssetGuard>
      <AssetGuard
        fallback={
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[18, 64]} />
              <meshStandardMaterial color="#626663" />
            </mesh>
            <Label
              position={[0, 3, 0]}
              text="Environment asset unavailable · reload to retry"
              wide
            />
          </>
        }
      >
        <Suspense
          fallback={
            <Label position={[0, 2, 0]} text="Opening the palace…" wide />
          }
        >
          <Decor state={state} room={room} quality={quality} />
        </Suspense>
      </AssetGuard>
      {state?.players
        .filter((p) => p.connected && p.room === (state.owner || ""))
        .map((p) => (
          <Character
            key={p.id}
            player={p}
            motor={p.id === room?.sessionId ? motor : undefined}
          />
        ))}
    </>
  );
}
