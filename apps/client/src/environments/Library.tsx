import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Block, Column, Arch, Flame, type Palette } from "./Architecture";
import { Prop } from "../Assets";
import { Label } from "../Label";
import { reducedMotion } from "../settings";
function Shelf({
  x,
  z,
  palette,
  open = false,
}: {
  x: number;
  z: number;
  palette: Palette;
  open?: boolean;
}) {
  const ref = useRef<THREE.Group>(null),
    books = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.88 }),
    [],
  );
  useMemo(() => {}, []);
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.position.x = THREE.MathUtils.damp(
        ref.current.position.x,
        x + (open ? 2.9 : 0),
        reducedMotion() ? 40 : 3,
        dt,
      );
    if (books.current && !books.current.userData.ready) {
      const o = new THREE.Object3D();
      let i = 0;
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 11; col++) {
          const h = 0.48 + ((col * 17 + row * 11) % 7) * 0.038;
          o.position.set(-1.18 + col * 0.233, 0.42 + row * 0.82 + h / 2, 0.13);
          o.scale.set(0.15 + (col % 3) * 0.015, h, 0.42);
          o.rotation.z = col % 5 === 0 ? 0.045 : 0;
          o.updateMatrix();
          books.current.setMatrixAt(i, o.matrix);
          books.current.setColorAt(
            i,
            new THREE.Color(
              ["#5c3330", "#455858", "#8b7451", "#393945", "#556044"][
                (col + row) % 5
              ],
            ),
          );
          i++;
        }
      books.current.instanceMatrix.needsUpdate = true;
      books.current.userData.ready = true;
    }
  });
  return (
    <group ref={ref} position={[x, 0, z]}>
      <Block
        at={[0, 2.4, -0.2]}
        size={[2.85, 4.8, 0.25]}
        material={palette.wood}
      />
      {[-1.4, 1.4].map((x) => (
        <group key={x}>
          <Block
            at={[x, 2.5, 0.05]}
            size={[0.16, 5, 0.8]}
            material={palette.wood}
          />
          <Block
            at={[x, 2.5, 0.48]}
            size={[0.06, 4.9, 0.055]}
            material={palette.brass}
          />
        </group>
      ))}
      {[0.3, 1.12, 1.94, 2.76, 3.58, 4.4, 4.9].map((y) => (
        <Block
          key={y}
          at={[0, y, 0.05]}
          size={[2.9, 0.1, 0.85]}
          material={palette.wood}
        />
      ))}
      <Block at={[0, 5.05, 0]} size={[3.1, 0.2, 0.9]} material={palette.wood} />
      <instancedMesh ref={books} args={[undefined, material, 55]} castShadow>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}
function Desk({ x, z, palette }: { x: number; z: number; palette: Palette }) {
  return (
    <group position={[x, 0, z]}>
      <Block
        at={[0, 1.02, 0]}
        size={[3, 0.16, 1.5]}
        material={palette.wood}
        block
      />
      <Block
        at={[0, 0.88, 0]}
        size={[2.8, 0.18, 1.3]}
        material={palette.wood}
      />
      {[-1.22, 1.22].map((x) => (
        <group key={x}>
          {[-0.52, 0.52].map((z) => (
            <mesh
              key={z}
              position={[x, 0.45, z]}
              material={palette.wood}
              castShadow
            >
              <cylinderGeometry args={[0.08, 0.12, 0.9, 12]} />
            </mesh>
          ))}
          <Block
            at={[x, 0.25, 0]}
            size={[0.08, 0.08, 1.2]}
            material={palette.wood}
          />
        </group>
      ))}
      <Block
        at={[0.3, 1.12, 0]}
        size={[0.7, 0.015, 0.45]}
        material={palette.ivory}
        rotate={0.2}
      />
      <Block
        at={[0.15, 1.13, 0.1]}
        size={[0.6, 0.015, 0.45]}
        material={palette.ivory}
        rotate={-0.1}
      />
      <Block
        at={[-0.6, 1.2, 0]}
        size={[0.48, 0.15, 0.6]}
        material={palette.dark}
      />
      <Flame position={[1, 1.55, -0.35]} />
    </group>
  );
}
export default function Library({
  palette,
  open,
}: {
  palette: Palette;
  open: boolean;
}) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={palette.wood}
        receiveShadow
      >
        <planeGeometry args={[18, 18]} />
      </mesh>
      {[-8.8, 8.8].map((x) => (
        <Block
          key={x}
          at={[x, 4, 0]}
          size={[0.45, 8, 18]}
          material={palette.stone}
          block
        />
      ))}
      <Block
        at={[0, 4, -8.8]}
        size={[18, 8, 0.45]}
        material={palette.stone}
        block
      />
      <Block
        at={[0, 4, 8.8]}
        size={[18, 8, 0.45]}
        material={palette.stone}
        block
      />
      {[-6, -3, 3, 6].map((x) => (
        <Shelf key={x} x={x} z={-8} palette={palette} />
      ))}
      <Shelf x={0} z={-7.8} palette={palette} open={open} />
      <Block
        at={[0, 0.6, -7.8]}
        size={[0.85, 0.8, 0.55]}
        material={palette.wood}
      />
      <Block
        at={[0, 0.9, -7.44]}
        size={[0.7, 0.12, 0.08]}
        material={palette.brass}
      />
      {/* Side alcoves sit outside the original clear navigation corridor. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Arch
            position={[side * 8.5, 0, -1]}
            rotation={Math.PI / 2}
            width={3.4}
            height={6.8}
            material={palette.marble}
          />
          {[-5, 3].map((z) => (
            <Column
              key={z}
              x={side * 8.4}
              z={z}
              height={6.5}
              palette={palette}
            />
          ))}
          <mesh
            position={[side * 8.48, 4.3, -1]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[2.7, 3.5]} />
            <meshStandardMaterial
              color="#68818a"
              emissive="#66899b"
              emissiveIntensity={0.5}
              roughness={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[-1, 0, 1].map((y) => (
            <Block
              key={y}
              at={[side * 8.4, 4.3 + y, -1]}
              size={[0.1, 0.06, 2.8]}
              material={palette.brass}
            />
          ))}
          <Block
            at={[side * 8.4, 4.3, -1]}
            size={[0.1, 3.5, 0.07]}
            material={palette.brass}
          />
          <spotLight
            position={[side * 8, 5.5, -1]}
            intensity={65}
            angle={0.75}
            penumbra={0.5}
            color="#adc5d7"
            target-position={[0, 0, 0]}
            distance={20}
          />
        </group>
      ))}
      <Prop name="clock" position={[-6, 0, -5]} height={3.65} />
      <group position={[-6, 2.6, -4.65]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={palette.brass}>
          <torusGeometry args={[0.29, 0.018, 6, 32]} />
        </mesh>
      </group>
      <Desk x={5} z={-4} palette={palette} />
      <group position={[-5, 0, 3]}>
        <Block
          at={[0, 0.78, 0]}
          size={[2, 0.14, 1.5]}
          material={palette.wood}
          block
        />
        {[-0.8, 0.8].map((x) => (
          <Block
            key={x}
            at={[x, 0.38, 0]}
            size={[0.15, 0.76, 1.1]}
            material={palette.wood}
          />
        ))}
        <Block
          at={[0, 0.95, 0]}
          size={[0.55, 0.18, 0.6]}
          material={palette.dark}
        />
        <Block
          at={[0, 1.05, 0.01]}
          size={[0.48, 0.025, 0.54]}
          material={palette.ivory}
        />
        <Flame position={[0.7, 1.2, -0.4]} />
      </group>
      <group position={[5, 0, 3]}>
        <Block
          at={[0, 0.12, 0]}
          size={[1.4, 0.24, 1.4]}
          material={palette.marble}
        />
        <Block
          at={[0, 0.85, 0]}
          size={[1, 1.4, 1]}
          material={palette.stone}
          block
        />
        <Block
          at={[0, 1.57, 0]}
          size={[1.4, 0.12, 1.4]}
          material={palette.marble}
        />
        <Prop
          name="bust"
          position={[0, 1.63, 0]}
          height={1.05}
          rotation={-0.5}
        />
      </group>
      {/* Brass clockwork and a displaced volume make the mechanism discoverable. */}
      <Block
        at={[-3, 2, -7.12]}
        size={[0.2, 0.6, 0.34]}
        material={palette.brass}
      />
      <Label position={[-3, 3, -6.95]} text="THE UNFINISHED VOLUME" wide />
      <group position={[0, 6.7, 0]}>
        <Prop name="chandelier" position={[0, 0, 0]} height={1.7} />
      </group>
      <pointLight
        position={[0, 5.5, 0]}
        intensity={65}
        distance={15}
        color="#ffd49a"
      />
      {[-6, 6].map((x) => (
        <pointLight
          key={x}
          position={[x, 3, -5]}
          intensity={18}
          distance={8}
          color="#f7b97b"
        />
      ))}
      {[-5, 0, 5].map((z) => (
        <group key={z}>
          <Arch
            position={[0, 0, z]}
            width={17.2}
            height={8.5}
            material={palette.stone}
            depth={0.45}
          />
          <Block
            at={[0, 7.8, z]}
            size={[17, 0.22, 0.25]}
            material={palette.wood}
          />
        </group>
      ))}
      <Block at={[0, 8.6, 0]} size={[18, 0.3, 18]} material={palette.wood} />
      <group position={[0, 0.015, 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.5, 5]} />
          <meshStandardMaterial color="#4a3431" roughness={1} />
        </mesh>
        {[-1.65, 1.65].map((x) => (
          <Block
            key={x}
            at={[x, 0.006, 0]}
            size={[0.045, 0.005, 4.8]}
            material={palette.brass}
          />
        ))}
      </group>
      <Label
        position={[0, 2, 7.9]}
        text="THE THIRD EXPEDITION · RETURNED WITHOUT A SKY"
        wide
      />
    </group>
  );
}
