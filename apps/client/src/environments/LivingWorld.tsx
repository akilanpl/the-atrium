import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Snapshot } from "../../../../packages/shared/src/world";
import { universe } from "../../../../packages/shared/src/universes";
import { reducedMotion, type Quality } from "../settings";
import { Arch } from "./Architecture";
import type { Palette } from "./Architecture";
export function LivingWorld({
  state,
  palette,
  quality,
}: {
  state: Snapshot | null;
  palette: Palette;
  quality: Quality;
}) {
  const world = state?.owner ? state.world : "";
  const rotating = useRef<THREE.Group>(null),
    drifting = useRef<THREE.Points>(null),
    material = useRef<THREE.MeshBasicMaterial>(null);
  const count = quality === "LOW" ? 48 : quality === "HIGH" ? 160 : 96;
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963,
        r = 5 + ((i * 17) % 100) / 10;
      p.set(
        [Math.sin(a) * r, 2 + ((i * 13) % 90) / 10, Math.cos(a) * r],
        i * 3,
      );
    }
    return p;
  }, [count]);
  const color = world ? universe(world).color : "#c4b387";
  useFrame(({ clock }) => {
    const t = reducedMotion() ? 0 : clock.elapsedTime;
    if (rotating.current) {
      rotating.current.rotation.y = Math.sin(t * 0.12) * 0.06;
      rotating.current.rotation.z =
        world === "garden" ? Math.sin(t * 0.9) * 0.025 : 0;
    }
    if (drifting.current) {
      drifting.current.rotation.y =
        t * (world === "sanctuary" ? -0.012 : 0.006);
      drifting.current.position.y = Math.sin(t * 0.2) * 0.15;
    }
    if (material.current)
      material.current.opacity = 0.04 + Math.sin(t * 0.7) * 0.012;
  });
  return (
    <group>
      {world &&
        world !== "library" &&
        Array.from({ length: world === "garden" ? 6 : 8 }, (_, i) => {
          const a = (i * Math.PI) / 4,
            radius = world === "observatory" || world === "garden" ? 13 : 11;
          return (
            <group
              key={"arcade" + i}
              position={[Math.sin(a) * radius, 0, Math.cos(a) * radius]}
              rotation={[0, a, 0]}
            >
              <Arch
                position={[0, 0, 0]}
                width={world === "manor" ? 3.4 : 4.2}
                height={world === "observatory" ? 10 : 7.2}
                depth={0.65}
                material={
                  world === "forge"
                    ? palette.dark
                    : world === "manor"
                      ? palette.wood
                      : palette.stone
                }
              />
              <Arch
                position={[0, 0, -0.4]}
                width={world === "manor" ? 3.6 : 4.4}
                height={world === "observatory" ? 10.2 : 7.4}
                depth={0.08}
                material={palette.brass}
              />
              <mesh position={[0, 0.15, 0]} material={palette.stone}>
                <boxGeometry args={[5.4, 0.3, 1.4]} />
              </mesh>
              <mesh position={[0, 6.3, 0]} material={palette.brass}>
                <boxGeometry args={[4.7, 0.08, 0.12]} />
              </mesh>
            </group>
          );
        })}
      {world === "observatory" && (
        <mesh
          position={[0, 11, 0]}
          material={palette.brass}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[12, 0.16, 8, 80]} />
        </mesh>
      )}

      <points ref={drifting}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={world === "observatory" ? "#c8d9ff" : color}
          size={world === "observatory" ? 0.045 : 0.022}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </points>
      <group ref={rotating}>
        {world === "observatory" &&
          [0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[0, 6.8 + i * 0.3, 0]}
              rotation={[0.28 + i * 0.18, 0, i * 0.6]}
              material={palette.brass}
            >
              <torusGeometry args={[6 + i * 1.8, 0.035, 6, 80]} />
            </mesh>
          ))}
        {world === "garden" &&
          [-1, 1].map((side) => (
            <group key={side} position={[side * 6.5, 0, -5]}>
              <mesh position={[0, 3, 0]} material={palette.stone}>
                <cylinderGeometry args={[0.14, 0.22, 6, 10]} />
              </mesh>
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh
                  key={i}
                  position={[Math.sin(i) * 0.5, 5 - i * 0.45, 0]}
                  rotation={[0, 0, 0.45]}
                  material={palette.brass}
                >
                  <coneGeometry args={[0.16, 0.65, 6]} />
                </mesh>
              ))}
            </group>
          ))}
      </group>
      {world === "sanctuary" && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1, 8, 64, 8, 0, Math.PI * 1.8]} />
          <meshBasicMaterial
            ref={material}
            color="#a4f7df"
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </mesh>
      )}
      {["manor", "forge", "sanctuary"].includes(world) &&
        [-1, 1].map((side) => (
          <group key={side} position={[side * 7.3, 0, 0]}>
            {[-6, -2, 2, 6].map((z) => (
              <group key={z} position={[0, 0, z]}>
                <mesh
                  position={[0, 2.8, 0]}
                  material={world === "forge" ? palette.brass : palette.stone}
                >
                  <cylinderGeometry args={[0.2, 0.3, 5.6, 12]} />
                </mesh>
                {[0.35, 4.8, 5.5].map((y) => (
                  <mesh key={y} position={[0, y, 0]} material={palette.brass}>
                    <cylinderGeometry args={[0.38, 0.38, 0.12, 12]} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        ))}
      {world === "manor" &&
        [-1, 1].map((side) => (
          <group key={side} position={[side * 7.65, 0, 0]}>
            {[0.25, 1.1, 4.8, 5.7].map((y) => (
              <mesh key={y} position={[0, y, 0]} material={palette.brass}>
                <boxGeometry args={[0.08, 0.06, 17]} />
              </mesh>
            ))}
            {[-6, -3, 0, 3, 6].map((z) => (
              <mesh key={z} position={[0, 2.8, z]} material={palette.wood}>
                <boxGeometry args={[0.12, 3.4, 0.08]} />
              </mesh>
            ))}
          </group>
        ))}
    </group>
  );
}
