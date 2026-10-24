import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { reducedMotion } from "../settings";
const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `varying vec2 vUv; uniform float time;uniform float charge;
void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float ed=1.-smoothstep(.88,1.,r);float ripple=.5+.5*sin(r*24.-time*1.4+sin(a*6.+time*.3)*.8);float filaments=pow(.5+.5*sin(a*11.+r*12.-time*.3),12.);vec3 dark=vec3(.035,.10,.13);vec3 lit=vec3(.40,.68,.61);vec3 col=mix(dark,lit,(ripple*.22+filaments*.32+pow(r,4.)*.4)*(.45+charge));gl_FragColor=vec4(col,ed*(.48+charge*.32));}`;
export function PortalVeil({ charge }: { charge: number }) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, charge: { value: 0 } }),
    [],
  );
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    uniforms.time.value = reducedMotion() ? 0 : clock.elapsedTime;
    uniforms.charge.value = THREE.MathUtils.damp(
      uniforms.charge.value,
      charge,
      3,
      dt,
    );
  });
  return (
    <mesh position={[0, 0, 0.02]}>
      <circleGeometry args={[2.13, 64]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
