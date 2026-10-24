import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type Snapshot } from "../../../packages/shared/src/world";
import type { Connection } from "./network";
import { transitionIdentity } from "./presentation";
import { shortestAngle } from "./motion";
import { reducedMotion } from "./settings";
export interface Motor {
  x: number;
  z: number;
  y: number;
  yaw: number;
  speed: number;
  moving: boolean;
}
export function Controls({
  state,
  room,
  interact,
  motor,
  onView,
}: {
  state: Snapshot | null;
  room: Connection | null;
  interact: (release?: boolean) => void;
  motor: React.RefObject<Motor>;
  onView: (view: { heading: number; pitch: number }) => void;
}) {
  const keys = useRef(new Set<string>()),
    angle = useRef(0.1),
    pitch = useRef(0.32),
    distance = useRef(5),
    last = useRef(0),
    tag = useRef(""),
    velocity = useRef(new THREE.Vector2()),
    callback = useRef(interact),
    blockers = useRef<THREE.Object3D[]>([]),
    scan = useRef(0),
    ray = useRef(new THREE.Raycaster());
  callback.current = interact;
  const recenter = useRef(false);
  const opening = useRef((() => {
    try { return sessionStorage.getItem("atrium:intro") ? 6 : 0; } catch { return 0; }
  })());
  const viewTick = useRef(0);
  const sequence = useRef(0);
  const actionSeen = useRef(0),
    facingTarget = useRef(0),
    facingUntil = useRef(0);
  const local = state?.players.find((p) => p.id === room?.sessionId);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(e.code)
      )
        e.preventDefault();
      keys.current.add(e.code);
      if (e.code === "KeyE" && !e.repeat) callback.current();
      if (e.code === "KeyR") recenter.current = true;
      if (e.code === "Escape") opening.current = 6;
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      if (
        e.code === "KeyE" &&
        !(e.target as HTMLElement).closest("input,textarea,select")
      )
        callback.current(true);
    };
    const clear = () => {
      keys.current.clear();
      velocity.current.set(0, 0);
    };
    const mouse = (e: MouseEvent) => {
      if (e.buttons === 2) {
        recenter.current = false;
        angle.current -= e.movementX * 0.0035;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current + e.movementY * 0.0025,
          -0.05,
          1,
        );
      }
    };
    const wheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
        distance.current = THREE.MathUtils.clamp(
          distance.current + e.deltaY * 0.004,
          2.6,
          7.5,
        );
      }
    };
    const skipIntro = () => { opening.current = 6; };
    window.addEventListener("atrium:skip-intro", skipIntro);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    window.addEventListener("mousemove", mouse);
    window.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("atrium:skip-intro", skipIntro);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      window.removeEventListener("mousemove", mouse);
      window.removeEventListener("wheel", wheel);
    };
  }, [motor]);
  useFrame(({ camera, clock, scene }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!room) {
      opening.current = Math.min(6, opening.current + dt);
      const t = reducedMotion() ? 1 : opening.current / 6;
      const eased = t * t * (3 - 2 * t);
      const target = new THREE.Vector3(
        3.5 + eased * 6,
        3.2 + eased * 2,
        15 - eased * 3.3,
      );
      camera.position.lerp(target, 1 - Math.exp(-dt * 3));
      camera.lookAt(0, 2.4, 0);
      return;
    }
    if (!local) return;
    if (recenter.current) {
      const turn = shortestAngle(angle.current, motor.current.yaw + Math.PI);
      angle.current += turn * (1 - Math.exp(-dt * 7));
      if (Math.abs(turn) < 0.01) recenter.current = false;
    }
    angle.current +=
      (+keys.current.has("ArrowLeft") - +keys.current.has("ArrowRight")) *
      dt *
      1.4;
    pitch.current = THREE.MathUtils.clamp(
      pitch.current +
        (+keys.current.has("ArrowUp") - +keys.current.has("ArrowDown")) *
          dt *
          0.45,
      -0.05,
      1,
    );

    const key = transitionIdentity(
      state!.epoch,
      state!.owner,
      state!.phase,
      state!.round,
    );
    const changed = tag.current !== key;
    if (tag.current !== key) {
      tag.current = key;
      Object.assign(motor.current, {
        x: local.x,
        z: local.z,
        y: local.y,
        yaw: local.yaw,
        speed: 0,
      });
      velocity.current.set(0, 0);
      scan.current = 0;
    }
    if (clock.elapsedTime - viewTick.current > 0.1) {
      viewTick.current = clock.elapsedTime;
      onView({
        heading: THREE.MathUtils.radToDeg(angle.current),
        pitch: pitch.current,
      });
    }
    const p = motor.current;
    const forward = +keys.current.has("KeyW") - +keys.current.has("KeyS"),
      side = +keys.current.has("KeyD") - +keys.current.has("KeyA");
    const wish = new THREE.Vector2(
      side * Math.cos(angle.current) - forward * Math.sin(angle.current),
      -forward * Math.cos(angle.current) - side * Math.sin(angle.current),
    );
    if (wish.lengthSq() > 0) wish.normalize();
    p.x = THREE.MathUtils.damp(p.x, local.x, 18, dt);
    p.z = THREE.MathUtils.damp(p.z, local.z, 18, dt);
    p.y = THREE.MathUtils.damp(p.y || 0, local.y, 18, dt);
    p.speed = local.speed;
    p.moving = p.speed > 0.08;
    velocity.current.set(local.vx, local.vz);
    if (local.action !== actionSeen.current) {
      actionSeen.current = local.action;
      facingTarget.current = local.yaw;
      facingUntil.current = clock.elapsedTime + 0.6;
    }
    if (clock.elapsedTime < facingUntil.current)
      p.yaw +=
        shortestAngle(p.yaw, facingTarget.current) * (1 - Math.exp(-dt * 15));
    else if (p.moving)
      p.yaw +=
        shortestAngle(
          p.yaw,
          Math.atan2(velocity.current.x, velocity.current.y),
        ) *
        (1 - Math.exp(-dt * 14));
    if (clock.elapsedTime - last.current > 0.05) {
      last.current = clock.elapsedTime;
      room.send("input", {
        epoch: state!.epoch,
        seq: ++sequence.current,
        x: wish.x,
        z: wish.y,
        yaw: p.yaw,
        run: keys.current.has("ShiftLeft") || keys.current.has("ShiftRight"),
        jump: keys.current.has("Space"),
        descend: keys.current.has("KeyC"),
      });
    }
    if (clock.elapsedTime - scan.current > 0.5) {
      scan.current = clock.elapsedTime;
      blockers.current = [];
      scene.traverse((o) => {
        if (o.userData.cameraBlock) blockers.current.push(o);
      });
    }
    const eye = new THREE.Vector3(p.x, p.y + 1.4, p.z),
      target = new THREE.Vector3(
        p.x + Math.sin(angle.current) * distance.current,
        p.y + 1.4 + pitch.current * distance.current,
        p.z + Math.cos(angle.current) * distance.current,
      );
    const direction = target.clone().sub(eye).normalize();
    const cameraRight = new THREE.Vector3()
      .crossVectors(direction, camera.up)
      .normalize();
    let safe = eye.distanceTo(target);
    for (const offset of [-0.18, 0, 0.18]) {
      ray.current.set(
        eye.clone().addScaledVector(cameraRight, offset),
        direction,
      );
      ray.current.near = 0.05;
      ray.current.far = safe;
      const hit = ray.current.intersectObjects(blockers.current, false)[0];
      if (hit) safe = Math.min(safe, Math.max(0.45, hit.distance - 0.3));
    }
    target.copy(eye).addScaledVector(direction, safe);
    const blocked = camera.position.distanceTo(eye) > safe + 0.1;
    camera.position.lerp(
      target,
      blocked || changed ? 1 : 1 - Math.exp(-dt * 12),
    );
    camera.position.y = Math.max(0.4, camera.position.y);
    camera.lookAt(eye);
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = p.speed > 2.6 && !reducedMotion() ? 59 : 55;
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 5, dt);
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
