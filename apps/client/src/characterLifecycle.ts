import * as THREE from "three";
/** Dispose instance-owned GPU state, keeping shared loader-cache geometry/textures intact. */
export function releaseCharacter(
  model: THREE.Object3D,
  mixer: THREE.AnimationMixer,
  materials: THREE.Material[],
) {
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  materials.forEach((m) => m.dispose());
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton);
  });
  skeletons.forEach((s) => s.dispose());
}
