import { PortalVeil } from "./PortalVeil";
import { DoorCrest } from "./DoorCrest";
import { reducedMotion } from "../settings";
import { useEffect } from "react";
import {
  UNIVERSES,
  door,
  MAX_UNIVERSES,
} from "../../../../packages/shared/src/universes";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Snapshot } from "../../../../packages/shared/src/world";
import { Block, Column, Arch, Flame, type Palette } from "./Architecture";
import { Prop } from "../Assets";
import { Label } from "../Label";
function Portal({
  palette,
  state,
  playerId,
}: {
  palette: Palette;
  state: Snapshot | null;
  playerId?: string;
}) {
  const moving = useRef<THREE.Group>(null),
    energy = useRef<THREE.Mesh>(null),
    light = useRef<THREE.PointLight>(null);
  const me = state?.players.find((p) => p.id === playerId);
  const eligible =
    !!me &&
    me.keys.length === state!.players.length - 1 &&
    state!.phase === "FINALE";
  const won = state?.phase === "FINISHED";
  useFrame(({ clock }, dt) => {
    if (moving.current)
      moving.current.rotation.z += reducedMotion()
        ? 0
        : dt * (eligible || won ? 0.12 : 0.025);
    if (energy.current) {
      const mat = energy.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(
        mat.opacity,
        eligible || won ? 0.8 : 0.16,
        4,
        dt,
      );
      mat.emissiveIntensity = won ? 2.5 : 0.5 + (me?.keys.length || 0) * 0.2;
    }
    if (light.current)
      light.current.intensity = THREE.MathUtils.damp(
        light.current.intensity,
        won ? 45 : 12 + (me?.keys.length || 0) * 4,
        3,
        dt,
      );
  });
  return (
    <group>
      <mesh position={[0, 0.09, 0]} receiveShadow material={palette.stone}>
        <cylinderGeometry args={[3.3, 3.5, 0.18, 64]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 0.19 + i * 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={palette.brass}
        >
          <ringGeometry args={[2.5 + i * 0.2, 2.54 + i * 0.2, 72]} />
        </mesh>
      ))}
      <group position={[0, 3.05, 0]}>
        <PortalVeil
          charge={
            won
              ? 1
              : (me?.keys.length || 0) /
                Math.max(1, (state?.players.length || 6) - 1)
          }
        />
        <mesh material={palette.stone} castShadow>
          <torusGeometry args={[2.5, 0.36, 12, 80]} />
        </mesh>
        <mesh material={palette.brass}>
          <torusGeometry args={[2.16, 0.055, 8, 80]} />
        </mesh>
        <group ref={moving}>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8;
            return (
              <group
                key={i}
                position={[Math.sin(a) * 2.54, Math.cos(a) * 2.54, 0]}
                rotation={[0, 0, -a]}
              >
                <Block
                  at={[0, 0, 0.32]}
                  size={[0.2, 0.35, 0.12]}
                  material={palette.brass}
                />
              </group>
            );
          })}
        </group>
        <mesh ref={energy}>
          <circleGeometry args={[2.14, 64]} />
          <meshStandardMaterial
            color={eligible ? "#a9c6b7" : "#435963"}
            emissive={eligible ? "#7fbaaa" : "#25434b"}
            emissiveIntensity={0.5}
            transparent
            opacity={0.16}
            roughness={0.2}
            metalness={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {Array.from({ length: MAX_UNIVERSES }, (_, i) => {
          const a = (i - 2.5) * 0.3;
          return (
            <group
              key={i}
              position={[Math.sin(a) * 2.5, -Math.cos(a) * 2.5, 0.4]}
            >
              <mesh
                rotation={[0, 0, Math.PI / 4]}
                material={
                  me && (i === 0 || me.keys.length >= i)
                    ? palette.brass
                    : palette.dark
                }
              >
                <boxGeometry args={[0.28, 0.28, 0.17]} />
              </mesh>
              <mesh position={[0, 0, 0.1]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial
                  color="#ceb87f"
                  emissive="#ceb87f"
                  emissiveIntensity={
                    me && (i === 0 || me.keys.length >= i) ? 2 : 0
                  }
                />
              </mesh>
            </group>
          );
        })}
      </group>
      {[-2.9, 2.9].map((x) => (
        <Block
          key={x}
          at={[x, 1.3, 0]}
          size={[0.6, 2.6, 0.9]}
          material={palette.marble}
          block
        />
      ))}
      <pointLight
        ref={light}
        position={[0, 2.5, 1.5]}
        color="#a7cfcc"
        intensity={12}
        distance={10}
      />
      <Label
        position={[0, 6.6, 0]}
        text={
          won
            ? "THE CONCORDANCE IS COMPLETE"
            : eligible
              ? "THE WAY IS OPEN"
              : "THE CONCORDANCE GATE"
        }
        wide
      />
    </group>
  );
}
export default function Atrium({
  palette,
  state,
  playerId,
}: {
  palette: Palette;
  state: Snapshot | null;
  playerId?: string;
}) {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const dark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#384348",
        roughness: 0.58,
        metalness: 0.12,
      }),
    [],
  );
  useEffect(() => () => dark.dispose(), [dark]);
  const matrix = new THREE.Object3D();
  const tilePositions: [number, number][] = [];
  for (let x = -16; x <= 16; x += 2)
    for (let z = -16; z <= 16; z += 2)
      if (Math.hypot(x, z) < 17 && (x + z) % 4 === 0)
        tilePositions.push([x, z]);
  useFrame(() => {
    if (tiles.current && !tiles.current.userData.ready) {
      tilePositions.forEach(([x, z], i) => {
        matrix.position.set(x, 0.009, z);
        matrix.updateMatrix();
        tiles.current!.setMatrixAt(i, matrix.matrix);
      });
      tiles.current.instanceMatrix.needsUpdate = true;
      tiles.current.userData.ready = true;
    }
  });
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={palette.marble}
        receiveShadow
      >
        <circleGeometry args={[18, 96]} />
      </mesh>
      <instancedMesh
        ref={tiles}
        args={[undefined, dark, tilePositions.length]}
        receiveShadow
      >
        <boxGeometry args={[1.95, 0.015, 1.95]} />
      </instancedMesh>
      {[4, 7, 11.8, 16.5].map((r) => (
        <mesh
          key={r}
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={palette.brass}
        >
          <ringGeometry args={[r, r + 0.045, 96]} />
        </mesh>
      ))}
      {/* Sixteen fluted piers and an elevated arcade form a complete architectural enclosure. */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return (
          <group key={i}>
            <Column
              x={Math.sin(a) * 14.7}
              z={Math.cos(a) * 14.7}
              height={10.5}
              palette={palette}
            />
            <group
              position={[Math.sin(a) * 17.2, 0, Math.cos(a) * 17.2]}
              rotation={[0, a, 0]}
            >
              <Block
                at={[0, 5, 0]}
                size={[6.9, 10, 0.7]}
                material={palette.stone}
                block
              />
              <Arch
                position={[0, 1, -0.4]}
                width={4.4}
                height={8.5}
                material={palette.marble}
              />
              <Block
                at={[0, 2.8, -0.5]}
                size={[2.9, 3.8, 0.08]}
                material={palette.dark}
              />
              <Block
                at={[0, 2.8, -0.57]}
                size={[0.08, 3.8, 0.08]}
                material={palette.brass}
              />
              {[-1.25, 1.25].map((x) => (
                <Flame key={x} position={[x, 3, -1.2]} />
              ))}
              {i % 4 === 0 && (
                <pointLight
                  position={[0, 3, -2]}
                  color="#ffb668"
                  intensity={14}
                  distance={7}
                />
              )}
            </group>
          </group>
        );
      })}
      {/* Barrel-vault ribs cross beneath a monumental coffered dome. */}
      <mesh position={[0, 10.5, 0]}>
        <meshStandardMaterial
          color="#414544"
          roughness={0.86}
          side={THREE.BackSide}
        />
        <sphereGeometry args={[18, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[0, 10.2, 0]} material={palette.brass}>
            <torusGeometry args={[17.2, 0.11, 8, 96, Math.PI]} />
          </mesh>
        </group>
      ))}
      {[5.8, 9.5].map((y) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={palette.stone}
        >
          <torusGeometry args={[17, 0.3, 8, 96]} />
        </mesh>
      ))}
      {UNIVERSES.map((u, i) => {
        const a = door(u.id).angle;
        const owner = state?.players.find((p) => p.universe === u.id);
        return (
          <group
            key={i}
            position={[Math.sin(a) * 10, 0, -Math.cos(a) * 10]}
            rotation={[0, -a, 0]}
          >
            <DoorCrest id={u.id} state={state} playerId={playerId} />
            <Arch
              position={[0, 0, 0]}
              width={3.6}
              height={6.7}
              depth={0.8}
              material={palette.marble}
            />
            <Block
              at={[0, 2.25, 0]}
              size={[3.4, 4.5, 0.55]}
              material={palette.wood}
              block
            />
            {[-0.8, 0.8].map((x) => (
              <group key={x}>
                <Block
                  at={[x, 2.25, 0.31]}
                  size={[1.4, 3.8, 0.1]}
                  material={palette.dark}
                />
                {[0.65, 3.85].map((y) => (
                  <Block
                    key={y}
                    at={[x, y, 0.4]}
                    size={[1.4, 0.055, 0.06]}
                    material={palette.brass}
                  />
                ))}
                <mesh
                  position={[x > 0 ? 0.22 : -0.22, 2, 0.48]}
                  material={palette.brass}
                >
                  <torusGeometry args={[0.12, 0.025, 6, 16]} />
                </mesh>
              </group>
            ))}
            <mesh
              position={[0, 5.2, 0]}
              rotation={[0, 0, Math.PI / 4]}
              material={palette.brass}
            >
              <boxGeometry args={[0.55, 0.55, 0.16]} />
            </mesh>
            <Label
              position={[0, 7.1, 0]}
              text={
                owner
                  ? `${owner.name} · ${u.name.toUpperCase()}`
                  : `${u.name.toUpperCase()} · SEALED`
              }
              wide
            />
            {[-2.1, 2.1].map((x) => (
              <Flame key={x} position={[x, 2.7, 0.5]} large />
            ))}
            {i % 2 === 0 && (
              <pointLight
                position={[0, 3, 2]}
                intensity={18}
                color="#ffc482"
                distance={7}
              />
            )}
          </group>
        );
      })}
      {/* Broad ceremonial stairs sit beyond the playable doors; colliders retain the original arena. */}
      {[-1, 1].map((side) => (
        <group
          key={side}
          rotation={[0, (Math.PI / 4) * side, 0]}
          position={[side * 9, 0, 10]}
        >
          {Array.from({ length: 7 }, (_, i) => (
            <Block
              key={i}
              at={[0, 0.12 + i * 0.18, i * 0.5]}
              size={[3, 0.24 + i * 0.36, 0.54]}
              material={palette.marble}
            />
          ))}
          <Column x={-1.9} z={3.1} height={5} palette={palette} />
          <Column x={1.9} z={3.1} height={5} palette={palette} />
        </group>
      ))}
      <Portal palette={palette} state={state} playerId={playerId} />
      <Prop name="chandelier" position={[0, 8.5, 0]} height={2.3} />
      <spotLight
        position={[0, 10, 0]}
        angle={0.8}
        penumbra={0.6}
        intensity={150}
        color="#ffd4a0"
        distance={25}
      />
    </group>
  );
}
