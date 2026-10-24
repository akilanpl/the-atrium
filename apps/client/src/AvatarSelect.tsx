import { Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  AVATARS,
  type AvatarId,
  type Player,
} from "../../../packages/shared/src/world";
import { Character } from "./Character";
import * as THREE from "three";
import { reducedMotion } from "./settings";
import { save } from "./settings";
export function AvatarSelect({
  value,
  onChange,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
}) {
  const [portrait, setPortrait] = useState(false);
  const p: Player = {
    y: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    universe: "",
    inspections: 0,
    id: "preview",
    name: "Traveler",
    x: 0,
    z: 0,
    yaw: 0,
    keys: [],
    ready: false,
    room: "",
    connected: true,
    finishedAt: 0,
    avatar: value,
    motion: "idle",
    speed: 0,
    action: 0,
  };
  return (
    <section className="avatar-selection">
      <div className="avatar-preview">
        <Canvas
          camera={{ position: [0, 1.15, 3.3], fov: 34 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.05, 0)}
          dpr={1}
        >
          <PortraitCamera close={portrait} />
          <ambientLight intensity={1.1} />
          <directionalLight
            position={[2, 3, 4]}
            intensity={2.5}
            color="#ffe6c4"
          />
          <directionalLight
            position={[-3, 2, 1]}
            intensity={1.3}
            color="#bacad9"
          />
          <Suspense fallback={null}>
            <group position={[0, -0.8, 0]}>
              <Character player={p} preview />
            </group>
          </Suspense>
        </Canvas>
        <span className="eyebrow">CHOOSE YOUR TRAVELER</span>
      </div>
      <button
        className="portrait-toggle"
        onClick={() => setPortrait(!portrait)}
      >
        {portrait ? "Full figure" : "Portrait"}
      </button>
      <div className="avatar-options">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            className={value === a.id ? "selected" : ""}
            onClick={() => {
              onChange(a.id);
              save("avatar", a.id);
            }}
            aria-pressed={value === a.id}
          >
            {a.name}
          </button>
        ))}
      </div>
      <p>{AVATARS.find((a) => a.id === value)?.description}</p>
    </section>
  );
}

function PortraitCamera({ close }: { close: boolean }) {
  useFrame(({ camera, clock }, dt) => {
    camera.position.lerp(
      new THREE.Vector3(
        reducedMotion()
          ? 0
          : Math.sin(clock.elapsedTime * 0.15) * (close ? 0.08 : 0.35),
        close ? 0.98 : 1.15,
        close ? 1.12 : 3.3,
      ),
      1 - Math.exp(-dt * 9),
    );
    camera.lookAt(0, close ? 0.86 : 0.05, 0);
  });
  return null;
}
