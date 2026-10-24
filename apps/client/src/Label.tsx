import { useFrame } from "@react-three/fiber";
import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
/** Canvas sprites avoid HTML portals inside the changing scene graph. */
export function Label({
  text,
  position,
  wide = false,
}: {
  text: string;
  position: [number, number, number];
  wide?: boolean;
}) {
  const sprite = useRef<THREE.Sprite>(null),
    worldPosition = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    if (sprite.current) {
      sprite.current.getWorldPosition(worldPosition);
      sprite.current.visible = worldPosition.distanceTo(camera.position) > 2.8;
    }
  });
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#102126cc";
    ctx.fillRect(0, 0, 1024, 128);
    ctx.font = `${wide ? 32 : 42}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#eed8a9";
    ctx.fillText(text, 512, 64, 980);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, wide]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      ref={sprite}
      position={position}
      scale={wide ? [3.4, 0.42, 1] : [1.4, 0.175, 1]}
    >
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
