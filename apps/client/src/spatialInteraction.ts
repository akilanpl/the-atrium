import * as THREE from "three";
import type { Point } from "../../../packages/shared/src/universes.js";
/** Camera targeting is presentation only. Server repeats distance, world, phase and LOS authorization. */
export function pickInteraction(
  camera: THREE.Camera,
  targets: THREE.Object3D[],
  blocks: THREE.Object3D[],
  player: Point,
  ray = new THREE.Raycaster(),
) {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = 13;
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return "";
  const id = String(hit.object.userData.interact || ""),
    position = hit.object.getWorldPosition(new THREE.Vector3()),
    limit = id.startsWith("door:") ? 3 : 2.7;
  if (
    !id ||
    Math.hypot(
      position.x - player.x,
      position.y - player.y - 0.7,
      position.z - player.z,
    ) > limit
  )
    return "";
  const wall = ray.intersectObjects(blocks, false)[0];
  if (wall && wall.distance < hit.distance - 0.3) return "";
  return id;
}
