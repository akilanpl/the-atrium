import { bodyState, observedSpeed } from "./presentation";
import type { UniverseId } from "../../../packages/shared/src/universes";
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
  world = "",
}: {
  player: Player;
  motor?: React.RefObject<Motor>;
  preview?: boolean;
  world?: UniverseId | "";
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
        <Human player={player} motor={motor} preview={preview} world={world} />
      </Suspense>
    </AssetBoundary>
  );
}
function Human({
  player,
  motor,
  preview,
  world,
}: {
  player: Player;
  motor?: React.RefObject<Motor>;
  preview: boolean;
  world: UniverseId | "";
}) {
  const asset = useGLTF(`/assets/characters/${player.avatar || "soren"}.glb`);
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const grounded = useRef(player.grounded),
    landing = useRef(0),
    smoothedSpeed = useRef(0);
  const previous = useRef<Motion>("idle"),
    active = useRef(""),
    transition = useRef(0),
    interaction = useRef(0),
    actionSeq = useRef(player.action),
    lastPos = useRef(new THREE.Vector2(player.x, player.z)),
    lastYaw = useRef(player.yaw);
  const overlays = useRef<{ bone: THREE.Bone; offset: THREE.Quaternion }[]>([]);
  const data = useMemo(() => {
    const model = clone(asset.scene);
    const ownedMaterials: THREE.Material[] = [];
    const limbs: THREE.Bone[] = [];
    const eyelids: { values: number[]; index: number }[] = [];
    model.traverse((o) => {
      if (
        o instanceof THREE.Bone &&
        /^(upperarm_[lr]|thigh_[lr]|calf_[lr])$/.test(o.name)
      )
        limbs.push(o);
      if (o instanceof THREE.Mesh) {
        if (o.morphTargetDictionary && o.morphTargetInfluences)
          for (const name of ["blink_left", "blink_right"]) {
            const index = o.morphTargetDictionary[name];
            if (index !== undefined)
              eyelids.push({ values: o.morphTargetInfluences, index });
          }
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
    return { model, mixer, actions, ownedMaterials, eyelids, limbs };
  }, [asset, player.avatar]);
  useEffect(() => {
    active.current = "";
    overlays.current = [];
    smoothedSpeed.current = 0;
    return () => releaseCharacter(data.model, data.mixer, data.ownedMaterials);
  }, [data]);
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
    const ground = preview ? 0 : "y" in desired ? desired.y : player.y;
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
      speed = observedSpeed(
        delta * Math.max(0.01, dt),
        Math.max(0.01, dt),
        separation > 3,
      );
    }
    smoothedSpeed.current = THREE.MathUtils.damp(
      smoothedSpeed.current,
      speed,
      12,
      dt,
    );
    speed = smoothedSpeed.current;
    const physical = preview
      ? "ground"
      : bodyState(world, player.grounded, player.vy, grounded.current);
    if (physical === "land") landing.current = 0.23;
    grounded.current = player.grounded;
    landing.current = Math.max(0, landing.current - dt);
    if (body.current) {
      const tilt =
        physical === "swim"
          ? -0.55
          : physical === "takeoff"
            ? -0.12
            : physical === "air"
              ? 0.09
              : 0;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        tilt,
        8,
        dt,
      );
      body.current.position.y =
        -Math.sin((landing.current / 0.23) * Math.PI) * 0.09;
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
    if (physical === "swim" || physical === "air" || physical === "takeoff")
      clip = "idle_breathe";
    if (motion === "stop" && transition.current > 0.18) clip = "idle_breathe";
    if (motion === "start" && transition.current > 0.12)
      clip = speed > 2.6 ? "run" : "walk";
    if (clip !== active.current) {
      data.actions[active.current]?.fadeOut(0.18);
      const action =
        data.actions[clip] ||
        data.actions.idle ||
        Object.values(data.actions)[0];
      if (!action) return;
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
    for (const { bone, offset } of overlays.current)
      bone.quaternion.multiply(offset.invert());
    overlays.current = [];
    data.mixer.update(Math.min(dt, 0.06));
    if (physical === "swim" || physical === "air" || physical === "takeoff") {
      const cycle = state.clock.elapsedTime * (physical === "swim" ? 2.4 : 1);
      for (const bone of data.limbs) {
        const side = bone.name.endsWith("_l") ? 1 : -1;
        const arm = bone.name.startsWith("upperarm");
        const angle =
          physical === "swim"
            ? arm
              ? Math.sin(cycle) * 0.25
              : Math.sin(cycle + side) * 0.16
            : arm
              ? -0.18
              : bone.name.startsWith("calf")
                ? 0.26
                : -0.16;
        const offset = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(angle, 0, arm ? side * 0.12 : 0),
        );
        bone.quaternion.multiply(offset);
        overlays.current.push({ bone, offset });
      }
    }
    // Only supported eyelid morphs are driven; faces keep the authored neutral expression.
    const phase =
      (state.clock.elapsedTime + (player.avatar === "mara" ? 1.7 : 0)) % 4.8;
    const blink = phase < 0.14 ? Math.sin((phase / 0.14) * Math.PI) : 0;
    for (const lid of data.eyelids) lid.values[lid.index] = blink;
  });
  return (
    <group ref={group} position={preview ? [0, 0, 0] : [player.x, 0, player.z]}>
      <group ref={body} scale={1.08}>
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
