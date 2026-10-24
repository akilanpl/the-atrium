import { Component, useMemo, type ReactNode } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
export class AssetGuard extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed
      ? this.props.fallback || null
      : this.props.children;
  }
}
export function Prop({
  name,
  position,
  height = 1,
  rotation = 0,
}: {
  name: "clock" | "bust" | "chandelier";
  position: [number, number, number];
  height?: number;
  rotation?: number;
}) {
  const gltf = useGLTF(`/assets/props/${name}.glb`);
  const { object, scale } = useMemo(() => {
    const object = gltf.scene.clone(true);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const offset = new THREE.Group();
    offset.add(object);
    object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    object.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (name !== "chandelier") o.userData.cameraBlock = true;
      }
    });
    return { object: offset, scale: height / Math.max(0.001, size.y) };
  }, [gltf, name, height]);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={object} dispose={null} />
    </group>
  );
}
export function usePalette() {
  const maps = useTexture(
    ["marble", "wood", "stone"].flatMap((name) =>
      ["color", "normal", "rough"].map(
        (map) => `/assets/materials/${name}-${map}.jpg`,
      ),
    ),
  );
  return useMemo(() => {
    const materials: Record<string, THREE.MeshStandardMaterial> = {};
    for (let i = 0; i < 3; i++) {
      const textures = maps.slice(i * 3, i * 3 + 3);
      textures.forEach((t, j) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(i === 0 ? 10 : 2, i === 0 ? 10 : 2);
        t.anisotropy = 4;
        if (j === 0) t.colorSpace = THREE.SRGBColorSpace;
      });
      materials[["marble", "wood", "stone"][i]] =
        new THREE.MeshStandardMaterial({
          map: textures[0],
          normalMap: textures[1],
          roughnessMap: textures[2],
          roughness: i === 0 ? 0.42 : 0.85,
          metalness: i === 0 ? 0.03 : 0,
          normalScale: new THREE.Vector2(0.65, 0.65),
          side: THREE.DoubleSide,
          color: i === 1 ? "#6e5140" : i === 2 ? "#aaa696" : "#c3c6bb",
        });
    }
    materials.brass = new THREE.MeshStandardMaterial({
      color: "#a58c55",
      metalness: 0.82,
      roughness: 0.34,
    });
    materials.dark = new THREE.MeshStandardMaterial({
      color: "#151e22",
      roughness: 0.76,
      metalness: 0.18,
    });
    materials.ivory = new THREE.MeshStandardMaterial({
      color: "#b5ad98",
      roughness: 0.8,
    });
    return materials;
  }, [
    maps[0],
    maps[1],
    maps[2],
    maps[3],
    maps[4],
    maps[5],
    maps[6],
    maps[7],
    maps[8],
  ]);
}
