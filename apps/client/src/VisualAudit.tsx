import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { World, type PerformanceSample } from "./World";
import {
  UNIVERSES,
  freshMechanism,
  type UniverseId,
} from "../../../packages/shared/src/universes";
import type { Snapshot } from "../../../packages/shared/src/world";
import { GRAPHICS, type Quality } from "./settings";
// Development-only art review. These fixtures are never connected to a multiplayer room.
export default function VisualAudit() {
  const [world, setWorld] = useState<UniverseId | "">("");
  const [quality, setQuality] = useState<Quality>("MEDIUM");
  const [sample, setSample] = useState<PerformanceSample | null>(null);
  const snapshot: Snapshot = {
    code: "",
    host: "",
    phase: "WAITING",
    deadline: 0,
    round: 0,
    players: [],
    clue: "",
    owner: world ? "authoring-preview" : "",
    open: false,
    winner: "",
    started: 0,
    ended: 0,
    advanceAt: 0,
    epoch: "audit",
    world,
    mechanism: freshMechanism(),
    layout: [0, 0, 0],
    decoys: [],
    outcome: "",
    overtime: false,
  };
  return (
    <main style={{ height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 4, 7], fov: 65 }}
        onCreated={({ camera }) => camera.lookAt(0, 2, -2)}
        dpr={GRAPHICS[quality].dpr}
        shadows={GRAPHICS[quality].shadows}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
          antialias: false,
        }}
      >
        <World
          controlsEnabled={false}
          state={snapshot}
          room={null}
          quality={quality}
          interact={() => {}}
          target=""
          onTarget={() => {}}
          onView={() => {}}
          onSample={setSample}
        />
      </Canvas>
      <aside
        style={{
          position: "fixed",
          left: 16,
          top: 16,
          padding: 16,
          background: "#101b23dd",
          color: "#e8d4a4",
          maxWidth: 420,
        }}
      >
        <p>AUTHORING PREVIEW · NOT A LIVE MATCH</p>
        <label>
          Scene{" "}
          <select
            aria-label="Audit scene"
            value={world}
            onChange={(e) => setWorld(e.target.value as UniverseId | "")}
          >
            <option value="">Grand Atrium</option>
            {UNIVERSES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {" "}
          Quality{" "}
          <select
            aria-label="Audit quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as Quality)}
          >
            {Object.keys(GRAPHICS).map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </label>
        <output aria-label="Audit performance">
          {sample ? JSON.stringify(sample) : "Sampling…"}
        </output>
      </aside>
    </main>
  );
}
