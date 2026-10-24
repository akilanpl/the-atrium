import { groundHeight } from "../../../packages/shared/src/world";
import { releaseCharacter } from "./characterLifecycle";
import React, {
  Suspense,
  useMemo,
  useEffect,
  useRef,
  Component,
  type ReactNode,
} from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import type {
  Player,
  AvatarId,
  Motion,
} from "../../../packages/shared/src/world";
import { Label } from "./Label";
import type { Motor } from "./Controls";
import { animationState, shortestAngle } from "./motion";
class AssetBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Label
        position={[0, 1.8, 0]}
        text={`${this.props.name} · model unavailable`}
      />
    ) : (
      this.props.children
    );
  }
}
export function Character({
  player,
  motor,
  preview = false,
}: {
  player: Player;
  motor?: React.RefObject<Motor>;
  preview?: boolean;
}) {
  return (
    <AssetBoundary name={player.name}>
      <Suspense
        fallback={
          <Label
            position={[player.x, 2, player.z]}
            text="Preparing traveler…"
          />
        }
      >
        <Human player={player} motor={motor} preview={preview} />
      </Suspense>
    </AssetBoundary>
  );
}
function Human({
  player,
  motor,
  preview,
}: {
  player: Player;
  motor?: React.RefObject<Motor>;
  preview: boolean;
}) {
  const asset = useGLTF(`/assets/characters/${player.avatar || "soren"}.glb`);
  const group = useRef<THREE.Group>(null);
  const previous = useRef<Motion>("idle"),
    active = useRef(""),
    transition = useRef(0),
    interaction = useRef(0),
    actionSeq = useRef(player.action),
    lastPos = useRef(new THREE.Vector2(player.x, player.z)),
    lastYaw = useRef(player.yaw);
  const data = useMemo(() => {
    const model = clone(asset.scene);
    const ownedMaterials: THREE.Material[] = [];
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const cloned = mats.map((m) => {
          const c = m.clone();
          ownedMaterials.push(c);
          if (c instanceof THREE.MeshStandardMaterial) {
            c.envMapIntensity = 0.45;
            if (o.name.includes("Cloth_shirt"))
              c.color.set(player.avatar === "mara" ? "#627267" : "#758298");
            if (o.name.includes("Hair")) {
              c.color.set(player.avatar === "mara" ? "#35221c" : "#3e3026");
              c.side = THREE.DoubleSide;
            }
            c.roughness = Math.max(0.4, c.roughness);
          }
          return c;
        });
        o.material = Array.isArray(o.material) ? cloned : cloned[0];
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(
      asset.animations.map((a) => [a.name, mixer.clipAction(a)]),
    );
    return { model, mixer, actions, ownedMaterials };
  }, [asset, player.avatar]);
  useEffect(
    () => () => {
      releaseCharacter(data.model, data.mixer, data.ownedMaterials);
    },
    [data],
  );
  useFrame((state, dt) => {
    if (!group.current) return;
    const current = group.current;
    const desired = preview
      ? { x: 0, z: 0, yaw: Math.PI * 0.12, speed: 0 }
      : motor?.current || player;
    const separation = Math.hypot(
      current.position.x - desired.x,
      current.position.z - desired.z,
    );
    const ground = preview
      ? 0
      : groundHeight(desired.x, desired.z, !!player.room);
    if (separation > 3) current.position.set(desired.x, ground, desired.z);
    else
      current.position.lerp(
        new THREE.Vector3(desired.x, ground, desired.z),
        1 - Math.exp(-dt * (motor ? 24 : 13)),
      );
    const yawChange = shortestAngle(lastYaw.current, desired.yaw);
    current.rotation.y +=
      shortestAngle(current.rotation.y, desired.yaw) * (1 - Math.exp(-dt * 13));
    let speed = desired.speed || 0;
    if (!motor && !preview) {
      const delta =
        lastPos.current.distanceTo(
          new THREE.Vector2(current.position.x, current.position.z),
        ) / Math.max(0.01, dt);
      speed = THREE.MathUtils.damp(player.speed, delta, 7, dt);
    }
    lastPos.current.set(current.position.x, current.position.z);
    lastYaw.current = desired.yaw;
    if (player.action !== actionSeq.current) {
      actionSeq.current = player.action;
      interaction.current = 0.85;
    }
    interaction.current = Math.max(0, interaction.current - dt);
    const motion = animationState(
      speed,
      previous.current,
      Math.abs(yawChange) > 0.03,
      interaction.current > 0,
    );
    if (motion !== previous.current) {
      transition.current = 0;
      previous.current = motion;
    }
    transition.current += dt;
    let clip =
      motion === "interact"
        ? "interact"
        : motion === "run"
          ? "run"
          : ["walk", "start", "stop"].includes(motion)
            ? "walk"
            : motion === "turn"
              ? "turn"
              : "idle_breathe";
    if (motion === "stop" && transition.current > 0.18) clip = "idle_breathe";
    if (motion === "start" && transition.current > 0.12)
      clip = speed > 2.6 ? "run" : "walk";
    if (clip !== active.current) {
      data.actions[active.current]?.fadeOut(0.18);
      const action = data.actions[clip] || data.actions.idle;
      action.reset().setEffectiveWeight(1).fadeIn(0.18).play();
      if (clip === "interact") {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else action.setLoop(THREE.LoopRepeat, Infinity);
      active.current = clip;
    }
    const action = data.actions[active.current];
    if (action && ["walk", "run"].includes(active.current))
      action.timeScale = THREE.MathUtils.clamp(
        speed / (active.current === "run" ? 2.11 : 1.59),
        0.1,
        2,
      );
    data.mixer.update(Math.min(dt, 0.06));
    // Only supported eyelid morphs are driven; faces keep the authored neutral expression.
    const phase =
      (state.clock.elapsedTime + (player.avatar === "mara" ? 1.7 : 0)) % 4.8;
    const blink = phase < 0.14 ? Math.sin((phase / 0.14) * Math.PI) : 0;
    data.model.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.morphTargetDictionary &&
        o.morphTargetInfluences
      )
        for (const name of ["blink_left", "blink_right"]) {
          const i = o.morphTargetDictionary[name];
          if (i !== undefined) o.morphTargetInfluences[i] = blink;
        }
    });
  });
  return (
    <group ref={group} position={preview ? [0, 0, 0] : [player.x, 0, player.z]}>
      <group scale={1.08}>
        <primitive object={data.model} dispose={null} />
      </group>
      {!preview && !motor && (
        <Label position={[0, 2.05, 0]} text={player.name} />
      )}
    </group>
  );
}
export function preloadCharacter(id: AvatarId) {
  useGLTF.preload(`/assets/characters/${id}.glb`);
}
