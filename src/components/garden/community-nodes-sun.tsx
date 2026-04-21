"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const sunVertex = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const sunFragment = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
  return v;
}
void main(){
  vec2 uv = vUv;
  float t = uTime * 0.15;
  float turb = fbm(uv*6.0 + t)*0.5 + fbm(uv*12.0 - t*0.7)*0.25;

  vec3 core = vec3(1.0, 0.30, 0.05);
  vec3 mid = vec3(1.0, 0.65, 0.15);
  vec3 surface = vec3(1.0, 0.90, 0.60);
  vec3 color = mix(core, mid, turb);
  color = mix(color, surface, smoothstep(0.4, 0.7, turb));

  float spots = smoothstep(0.62, 0.65, fbm(uv*8.0 + t*0.3));
  color = mix(color, vec3(0.6, 0.2, 0.05), spots * 0.4);

  float fresnel = dot(vViewDir, vNormal);
  color *= pow(fresnel, 0.4);

  color *= 2.5;
  gl_FragColor = vec4(color, 1.0);
}
`;

const coronaVertex = sunVertex;

const coronaFragment = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;
void main(){
  float fresnel = 1.0 - dot(vViewDir, vNormal);
  fresnel = pow(fresnel, 2.0);
  float pulse = 0.8 + sin(uTime*0.5)*0.1 + sin(uTime*1.3)*0.05;

  vec3 inner = vec3(1.0, 0.7, 0.20);
  vec3 outer = vec3(1.0, 0.3, 0.05);
  vec3 color = mix(inner, outer, fresnel);

  gl_FragColor = vec4(color, fresnel * 0.8 * pulse);
}
`;

function Sun() {
  const coronaRef = useRef<THREE.Mesh>(null);

  const sunShader = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 } },
      vertexShader: sunVertex,
      fragmentShader: sunFragment,
    }),
    [],
  );

  const coronaShader = useMemo(
    () => ({
      uniforms: { uTime: { value: 0 } },
      vertexShader: coronaVertex,
      fragmentShader: coronaFragment,
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    sunShader.uniforms.uTime.value = t;
    coronaShader.uniforms.uTime.value = t;
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.5, 48, 48]} />
        <shaderMaterial
          uniforms={sunShader.uniforms}
          vertexShader={sunShader.vertexShader}
          fragmentShader={sunShader.fragmentShader}
        />
      </mesh>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[1.65, 48, 48]} />
        <shaderMaterial
          uniforms={coronaShader.uniforms}
          vertexShader={coronaShader.vertexShader}
          fragmentShader={coronaShader.fragmentShader}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <pointLight intensity={5} color="#FDB813" distance={30} />
    </group>
  );
}

export default function CommunityNodesSun() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        alpha: true,
      }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.08} />
      <Sun />
    </Canvas>
  );
}
