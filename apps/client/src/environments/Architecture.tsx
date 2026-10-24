import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
export type Palette = Record<string, THREE.MeshStandardMaterial>;
export function Block({
  at,
  size,
  material,
  rotate = 0,
  block = false,
}: {
  at: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  rotate?: number;
  block?: boolean;
}) {
  return (
    <mesh
      position={at}
      rotation={[0, rotate, 0]}
      castShadow
      receiveShadow
      material={material}
      userData={{ cameraBlock: block }}
    >
      <boxGeometry args={size} />
    </mesh>
  );
}
export function Arch({
  position,
  width = 4,
  height = 6,
  rotation = 0,
  material,
  depth = 0.5,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
  rotation?: number;
  material: THREE.Material;
  depth?: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const radius = width / 2;
    shape.moveTo(-radius - 0.28, 0);
    shape.lineTo(-radius - 0.28, height - radius);
    shape.absarc(0, height - radius, radius + 0.28, Math.PI, 0, true);
    shape.lineTo(radius + 0.28, 0);
    shape.lineTo(radius, 0);
    shape.lineTo(radius, height - radius);
    shape.absarc(0, height - radius, radius, 0, Math.PI, false);
    shape.lineTo(-radius, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
      curveSegments: 16,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [width, height, depth]);
  return (
    <mesh
      position={position}
      rotation={[0, rotation, 0]}
      geometry={geometry}
      userData={{ cameraBlock: true }}
      material={material}
      castShadow
      receiveShadow
    />
  );
}
export function Column({
  x,
  z,
  palette,
  height = 9,
}: {
  x: number;
  z: number;
  palette: Palette;
  height?: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <Block
        at={[0, 0.18, 0]}
        size={[1.4, 0.36, 1.4]}
        material={palette.stone}
      />
      <mesh position={[0, 0.55, 0]} material={palette.marble} castShadow>
        <cylinderGeometry args={[0.62, 0.75, 0.45, 24]} />
      </mesh>
      <mesh
        position={[0, height / 2, 0]}
        material={palette.stone}
        userData={{ cameraBlock: true }}
        castShadow
      >
        <cylinderGeometry args={[0.42, 0.54, height - 1.2, 20]} />
      </mesh>
      {[1, height - 1.1].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={palette.brass}>
          <cylinderGeometry args={[0.58, 0.58, 0.12, 24]} />
        </mesh>
      ))}
      <Block
        at={[0, height - 0.35, 0]}
        size={[1.6, 0.5, 1.6]}
        material={palette.marble}
      />
    </group>
  );
}
export function Flame({
  position,
  large = false,
}: {
  position: [number, number, number];
  large?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(
        1 + Math.sin(clock.elapsedTime * 8 + position[0]) * 0.06,
      );
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 5) * 0.08;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry
          args={[large ? 0.3 : 0.1, large ? 0.2 : 0.08, 0.3, 12]}
        />
        <meshStandardMaterial color="#76502c" metalness={0.7} roughness={0.6} />
      </mesh>
      <mesh ref={ref} scale={large ? 1 : 0.5}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial
          color="#ffd697"
          emissive="#ffae4f"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
export function Dust({
  count = 100,
  library = false,
  reduced = false,
}: {
  count: number;
  library?: boolean;
  reduced?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    let seed = 173;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return new Float32Array(
      Array.from({ length: count * 3 }, (_, i) =>
        i % 3 === 1 ? random() * 7 : (random() - 0.5) * (library ? 15 : 30),
      ),
    );
  }, [count, library]);
  useFrame(({ clock }) => {
    if (ref.current && !reduced)
      ref.current.rotation.y = clock.elapsedTime * 0.009;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ddcda2"
        size={0.025}
        sizeAttenuation
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </points>
  );
}
