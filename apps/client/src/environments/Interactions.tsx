import { pickInteraction } from "../spatialInteraction";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Snapshot } from "../../../../packages/shared/src/world";
import {
  universe,
  objects,
  UNIVERSES,
  door,
} from "../../../../packages/shared/src/universes";
import { Label } from "../Label";
function Orb({
  at,
  color,
  r = 0.3,
}: {
  at: [number, number, number];
  color: string;
  r?: number;
}) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[r, 12, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}
export function WorldInteractions({
  state,
  target,
}: {
  state: Snapshot;
  target: string;
}) {
  const u = universe(state.world),
    s = state.mechanism;
  const gears = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (gears.current && !s.frozen) gears.current.rotation.z += dt * 0.5;
  });
  return (
    <>
      {objects(u.id).map((o) => {
        const at: [number, number, number] = [o.x, o.y + 0.7, o.z];
        const selected = state.workshop?.anchor === o.anchor && o.anchor >= 0;
        return (
          <group key={o.id} position={at}>
            <mesh userData={{ interact: o.id }}>
              <boxGeometry args={[0.85, 0.85, 0.85]} />
              <meshBasicMaterial
                transparent
                opacity={target === o.id ? 0.13 : 0.025}
                color={u.color}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry
                args={[target === o.id ? 0.48 : 0.3, 0.035, 6, 24]}
              />
              <meshStandardMaterial
                color={selected ? "#fff1a0" : u.color}
                emissive={selected ? "#fff1a0" : u.color}
                emissiveIntensity={target === o.id ? 2 : 0.3}
              />
            </mesh>
            {o.action && <Orb at={[0, 0.15, 0]} color={u.color} r={0.16} />}
            {(target === o.id || selected) && (
              <Label
                position={[0, 0.65, 0]}
                text={selected ? "YOUR KEY · " + o.name : o.name}
                wide
              />
            )}
          </group>
        );
      })}
      {state.decoys.map((i) => {
        const a = u.anchors[i];
        return (
          <mesh
            key={i}
            position={[a.x, a.y + 0.6, a.z]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <octahedronGeometry args={[0.14]} />
            <meshStandardMaterial
              color="#d6c79b"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        );
      })}
      {state.layout.map((slot, i) => (
        <group
          key={i}
          position={[i === 1 ? 6 : (i - 1) * 5, 0, slot ? -6 : i === 1 ? 0 : 5]}
        >
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.28, 0.4, 0.7, 8]} />
            <meshStandardMaterial
              color={u.color}
              wireframe={state.workshop?.previewProp === i}
            />
          </mesh>
          <Orb at={[0, 0.9, 0]} color={u.color} r={0.2} />
        </group>
      ))}
      {u.id === "library" && (
        <>
          <group ref={gears} position={[-3, 2.5, -7.7]}>
            {[-0.6, 0.6].map((x, i) => (
              <mesh key={i} position={[x, 0, 0]}>
                <torusGeometry args={[0.55, 0.1, 8, 16]} />
                <meshStandardMaterial
                  color="#ba9459"
                  metalness={0.85}
                  roughness={0.3}
                />
              </mesh>
            ))}
          </group>
          <Label
            position={[0, 3, -7]}
            text={
              state.open
                ? "PASSAGE OPEN"
                : s.stage
                  ? "WAIT FOR THE ESCAPEMENT"
                  : "PULL THE UNFINISHED VOLUME"
            }
            wide
          />
        </>
      )}
    </>
  );
}
export function Targeting({
  state,
  onTarget,
  playerId,
}: {
  state: Snapshot | null;
  playerId?: string;
  onTarget: (id: string) => void;
}) {
  const ray = useRef(new THREE.Raycaster()),
    last = useRef(""),
    timer = useRef(0),
    targets = useRef<THREE.Object3D[]>([]),
    blocks = useRef<THREE.Object3D[]>([]);
  useFrame(({ camera, scene }, dt) => {
    timer.current += dt;
    if (timer.current > 0.1) {
      timer.current = 0;
      targets.current = [];
      blocks.current = [];
      scene.traverse((o) => {
        if (o.userData.interact) targets.current.push(o);
        if (o.userData.cameraBlock) blocks.current.push(o);
      });
      const me = state?.players.find((p) => p.id === playerId);
      const id = me
        ? pickInteraction(
            camera,
            targets.current,
            blocks.current,
            me,
            ray.current,
          )
        : "";
      if (id !== last.current) {
        last.current = id;
        onTarget(id);
      }
    }
  });
  return state?.world ? null : (
    <>
      {[{ id: "portal", x: 0, z: 0 }, ...Object.values(importDoorTargets)].map(
        (d) => (
          <mesh
            key={d.id}
            position={[d.x, 1.2, d.z]}
            userData={{ interact: d.id }}
          >
            <boxGeometry args={[1.8, 2.4, 1]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ),
      )}
    </>
  );
}
const importDoorTargets = UNIVERSES.map((u) => ({
  ...door(u.id),
  id: "door:" + u.id,
}));
