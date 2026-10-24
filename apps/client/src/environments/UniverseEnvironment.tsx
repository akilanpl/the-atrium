import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Snapshot } from "../../../../packages/shared/src/world";
import {
  universe,
  mechanismSolids,
} from "../../../../packages/shared/src/universes";
import { Block, Column, Arch, type Palette } from "./Architecture";
import { Label } from "../Label";
function Box({
  at,
  size,
  color,
  metal = false,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  metal?: boolean;
}) {
  return (
    <mesh
      position={at}
      castShadow
      receiveShadow
      userData={{ cameraBlock: true }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={metal ? 0.7 : 0.15}
        roughness={metal ? 0.3 : 0.8}
      />
    </mesh>
  );
}
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
      <sphereGeometry args={[r, 16, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}
export default function UniverseEnvironment({
  state,
  palette,
}: {
  state: Snapshot;
  palette: Palette;
}) {
  const u = universe(state.world),
    s = state.mechanism;
  return (
    <group>
      <Label position={[0, 5, 7.5]} text={u.name.toUpperCase()} wide />
      {/* Each room has a different architectural plan; collision meshes use the registry verbatim. */}
      {u.id === "observatory" && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            material={palette.marble}
          >
            <circleGeometry args={[12, 64]} />
          </mesh>
          {[5, 8, 10].map((r) => (
            <mesh
              key={r}
              position={[0, 0.03, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={palette.brass}
            >
              <torusGeometry args={[r, 0.045, 6, 64]} />
            </mesh>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <Column
              key={i}
              x={Math.sin((i * Math.PI) / 4) * 10}
              z={Math.cos((i * Math.PI) / 4) * 10}
              height={7}
              palette={palette}
            />
          ))}
          <group
            position={[0, 2, 0]}
            rotation={[0, s.stage ? 0 : s.elapsed * 0.2, 0]}
          >
            {[0, 1, 2].map((i) => (
              <mesh key={i} rotation={[i * 0.6, 0, i * 0.7]}>
                <torusGeometry args={[1.2 + i * 0.25, 0.055, 8, 48]} />
                <meshStandardMaterial
                  color={u.color}
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
            ))}
            <Orb at={[0, 0, 0]} color="#e8dcb1" r={0.4} />
          </group>
          {Array.from({ length: 60 }, (_, i) => (
            <Orb
              key={i}
              at={[
                Math.sin(i * 13.7) * 18,
                7 + (i % 9),
                Math.cos(i * 9.3) * 18,
              ]}
              color={i % 2 ? "#b4b5e9" : "#e1d8a6"}
              r={0.025}
            />
          ))}
        </>
      )}
      {u.id === "sanctuary" && (
        <>
          <Box at={[0, -0.3, 0]} size={[18, 0.6, 20]} color="#244f55" />
          <mesh position={[0, 3.5, 0]}>
            <boxGeometry args={[17, 7, 19]} />
            <meshStandardMaterial
              color="#247e94"
              transparent
              opacity={0.065}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
          {[-6, 0, 6].map((x) => (
            <group key={x} position={[x, 0, -8]}>
              <Arch
                position={[0, 0, 0]}
                width={4}
                height={6}
                depth={1}
                material={palette.stone}
              />
            </group>
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <group
              key={i}
              position={[Math.sin(i * 4.1) * 7, 0, Math.cos(i * 3.7) * 8]}
            >
              {[0, 1, 2].map((j) => (
                <mesh
                  key={j}
                  position={[j * 0.18, 0.5 + j * 0.18, 0]}
                  rotation={[0.2, j * 0.5, 0.3]}
                >
                  <coneGeometry args={[0.14, 0.9 + j * 0.3, 5]} />
                  <meshStandardMaterial
                    color={i % 2 ? "#b56c99" : "#7bcfc3"}
                    emissive="#295e68"
                  />
                </mesh>
              ))}
            </group>
          ))}
          <Orb at={[s.crate, 3, -4]} color="#a6f5e5" r={0.55} />
          <Label position={[s.crate, 4, -4]} text="BUOYANT SEAL" />
          {Array.from({ length: 14 }, (_, i) => (
            <mesh
              key={i}
              position={[
                ((s.elapsed * (s.stage ? 1 : -1) + i * 1.3) % 14) - 7,
                1 + (i % 5),
                -2 - (i % 4),
              ]}
            >
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshBasicMaterial color="#a1f4ee" />
            </mesh>
          ))}
        </>
      )}
      {u.id === "forge" && (
        <>
          <Box at={[0, -0.3, 0]} size={[20, 0.6, 18]} color="#343038" metal />
          {[-8, 8].map((x) => (
            <group key={x}>
              <Box at={[x, 3, 0]} size={[1, 6, 16]} color="#302a30" metal />
              {[-5, 0, 5].map((z) => (
                <mesh
                  key={z}
                  position={[x * 0.91, 3, z]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[1, 0.15, 8, 24]} />
                  <meshStandardMaterial
                    color="#ff8855"
                    emissive="#ee4f26"
                    emissiveIntensity={0.7}
                  />
                </mesh>
              ))}
            </group>
          ))}
          <Box at={[0, 6, -3]} size={[16, 0.5, 1]} color="#776574" metal />
          {[-4, 4].map((x, i) => (
            <group key={x}>
              <Box
                at={[x, 0.12, -2]}
                size={[1.7, 0.24, 2.5]}
                color={i ? "#ae555b" : "#547baf"}
                metal
              />
              <Label
                position={[x, 2.7, -2]}
                text={i ? "REPULSION +" : "ATTRACTION −"}
              />
            </group>
          ))}
          <mesh position={[0, 0.04, -2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 2.5]} />
            <meshStandardMaterial
              color={s.stage ? "#697faf" : "#b96b75"}
              transparent
              opacity={0.18}
            />
          </mesh>
        </>
      )}
      {u.id === "manor" && (
        <>
          <Box at={[0, -0.2, 0]} size={[18, 0.4, 20]} color="#3b2c38" />
          {[-8, 8].map((x) => (
            <Box key={x} at={[x, 3, 0]} size={[0.5, 6, 18]} color="#443147" />
          ))}
          <Box at={[0, 3, -9]} size={[16, 6, 0.5]} color="#302633" />
          {[-5, 0, 5].map((x) => (
            <group key={x} position={[x, 0, -8.6]}>
              <Arch
                position={[0, 0, 0]}
                width={3.6}
                height={5}
                depth={0.3}
                material={palette.wood}
              />
              <mesh position={[0, 2.5, 0.1]}>
                <planeGeometry args={[1.5, 2.5]} />
                <meshStandardMaterial
                  color="#8a6573"
                  metalness={0.35}
                  roughness={0.35}
                />
              </mesh>
            </group>
          ))}
          {[-4, 4].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <Box
                at={[0, 1.4, 0]}
                size={[0.25, 2.8, 0.25]}
                color="#bc9b69"
                metal
              />
              <Orb at={[0, 3, 0]} color="#e8bc9c" r={0.13} />
            </group>
          ))}
        </>
      )}
      {u.id === "garden" && (
        <>
          <mesh position={[0, -0.4, 0]} receiveShadow material={palette.stone}>
            <cylinderGeometry args={[12, 8, 0.8, 8]} />
          </mesh>
          {[-5, 5].map((x) => (
            <group key={x} position={[x, 0, 3]}>
              <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.35, 0.8, 4, 8]} />
                <meshStandardMaterial color="#595c48" />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[Math.sin(i * 2) * 1.3, 4 + i * 0.6, 0]}
                >
                  <icosahedronGeometry args={[1.5, 1]} />
                  <meshStandardMaterial color={i % 2 ? "#547767" : "#385a51"} />
                </mesh>
              ))}
            </group>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <Box
              key={i}
              at={[-7 + i * 1.55, -0.02, -1.1]}
              size={[1.3, 0.15, 1.6]}
              color="#65756a"
            />
          ))}
          <group
            position={[0, 3.6, 0]}
            rotation={[0, 0, s.elapsed * s.turbine * 3]}
          >
            {[0, 1, 2, 3].map((i) => (
              <mesh
                key={i}
                rotation={[0, 0, (i * Math.PI) / 2]}
                position={[0, 0, 0]}
              >
                <boxGeometry args={[0.15, 3, 0.12]} />
                <meshStandardMaterial
                  color="#d2c798"
                  metalness={0.5}
                  roughness={0.5}
                />
              </mesh>
            ))}
          </group>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh
              key={i}
              position={[
                ((s.elapsed * (s.stage ? 1 : -1) * 2 + i * 1.5) % 16) - 8,
                1 + (i % 4),
                -2 - (i % 3),
              ]}
              rotation={[0, 0, 0.15]}
            >
              <boxGeometry args={[0.65, 0.015, 0.015]} />
              <meshBasicMaterial color="#bacfca" transparent opacity={0.4} />
            </mesh>
          ))}
        </>
      )}
      {mechanismSolids(u.id, s).map((b) => (
        <Box
          key={b.id}
          at={[b.x, b.y + b.h / 2, b.z]}
          size={[b.w, b.h, b.d]}
          color={
            b.id === "carriage"
              ? "#a7a7b8"
              : b.id.includes("platform")
                ? u.color
                : u.id === "manor"
                  ? "#5d425e"
                  : "#647077"
          }
          metal={u.id === "forge"}
        />
      ))}
      {u.anchors.map((a) => (
        <group key={a.id} position={[a.x, a.y, a.z]}>
          <mesh position={[0, 0.25, 0]} material={palette.brass}>
            <cylinderGeometry args={[0.24, 0.36, 0.5, 8]} />
          </mesh>
          <Orb at={[0, 0.65, 0]} color={u.color} r={0.17} />
        </group>
      ))}
      <pointLight
        position={[0, 5, 1]}
        color={u.color}
        intensity={28}
        distance={20}
      />
    </group>
  );
}
