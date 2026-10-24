import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Snapshot } from "../../../packages/shared/src/world";
import { burstEnvelope } from "./presentation";
import { reducedMotion } from "./settings";
// Events come exclusively from private authoritative snapshots; no network messages are sent.
export function Rewards({
  state,
  playerId,
}: {
  state: Snapshot | null;
  playerId?: string;
}) {
  const group = useRef<THREE.Group>(null),
    age = useRef(99),
    previous = useRef<{ epoch: string; count: number } | null>(null);
  const me = state?.players.find((p) => p.id === playerId);
  useFrame((_, dt) => {
    if (!group.current) return;
    if (state && me) {
      if (
        previous.current?.epoch === state.epoch &&
        me.keys.length > previous.current.count
      ) {
        age.current = 0;
        group.current.position.set(me.x, me.y + 1.2, me.z);
      }
      previous.current = { epoch: state.epoch, count: me.keys.length };
    } else previous.current = null;
    age.current += dt;
    const strength = burstEnvelope(age.current);
    group.current.visible = strength > 0;
    group.current.scale.setScalar(
      0.5 + strength * (reducedMotion() ? 0.2 : 0.8),
    );
    group.current.rotation.y += reducedMotion() ? 0 : dt * 0.7;
    for (const child of group.current.children) {
      if (child instanceof THREE.Mesh) {
        const m = child.material as THREE.MeshBasicMaterial;
        m.opacity = strength * 0.7;
      }
    }
  });
  return (
    <group ref={group} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[(i * Math.PI) / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[0.6 + i * 0.12, 0.015, 6, 40]} />
          <meshBasicMaterial color="#dfc78f" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
