import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  universe,
  door,
  type UniverseId,
} from "../../../../packages/shared/src/universes";
import type { Snapshot } from "../../../../packages/shared/src/world";
import { reducedMotion } from "../settings";
// Identifying mechanisms are ornamental. Only the server's interaction handler changes destination.
export function DoorCrest({
  id,
  state,
  playerId,
}: {
  id: UniverseId;
  state: Snapshot | null;
  playerId?: string;
}) {
  const ref = useRef<THREE.Group>(null),
    mat = useRef<THREE.MeshStandardMaterial>(null);
  const u = universe(id),
    d = door(id);
  useFrame(({ clock }, dt) => {
    const p = state?.players.find((p) => p.id === playerId);
    const near = p && Math.hypot(p.x - d.x, p.z - d.z) < 3.2;
    if (mat.current)
      mat.current.emissiveIntensity = THREE.MathUtils.damp(
        mat.current.emissiveIntensity,
        near ? 1.2 : 0.12,
        5,
        dt,
      );
    if (ref.current && !reducedMotion())
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.25) * 0.05;
  });
  return (
    <group position={[0, 5.2, 0.22]} ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.025, 6, 40]} />
        <meshStandardMaterial
          color={u.color}
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>
      {Array.from(
        {
          length:
            3 +
            [
              "library",
              "observatory",
              "sanctuary",
              "forge",
              "manor",
              "garden",
            ].indexOf(id),
        },
        (_, i) => (
          <mesh
            key={i}
            position={[
              Math.sin(i * 2.399) * 0.48,
              Math.cos(i * 2.399) * 0.48,
              0,
            ]}
            rotation={[0, 0, i * 1.2]}
          >
            <boxGeometry args={[0.04, 0.19, 0.04]} />
            <meshStandardMaterial
              color={u.color}
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
        ),
      )}
      <mesh>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          ref={mat}
          color={u.color}
          emissive={u.color}
          emissiveIntensity={0.12}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
