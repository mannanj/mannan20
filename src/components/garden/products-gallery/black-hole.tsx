"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DISK_SIZE = 8.6;
const CORE_RADIUS = 1.15;
const PARTICLE_COUNT = 520;

const VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform float uFade;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float swirl = sin(a * 6.0 + r * 16.0 - uTime * 3.2);
    float swirl2 = sin(a * 3.0 - r * 10.0 + uTime * 1.6);
    float streak = 0.5 + 0.5 * swirl * swirl2;
    float ring = smoothstep(0.5, 0.3, abs(r - 0.58));
    float photon = smoothstep(0.12, 0.0, abs(r - 0.31));
    float halo = smoothstep(1.0, 0.2, r) * 0.25;
    float disk = ring * (0.35 + 0.75 * streak) + halo + photon * 1.4;
    vec3 col = mix(uColorB, uColorA, streak);
    col = mix(col, vec3(1.0), photon * 0.75);
    float alpha = disk * (0.6 + 0.4 * uProgress) * uFade;
    gl_FragColor = vec4(col * (0.85 + 0.9 * streak), alpha);
  }
`;

interface BlackHoleProps {
  introRef: React.RefObject<number>;
}

export function BlackHole({ introRef }: BlackHoleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const diskRef = useRef<THREE.ShaderMaterial>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uFade: { value: 0 },
      uColorA: { value: new THREE.Color("#9bd0ff") },
      uColorB: { value: new THREE.Color("#ff8a3c") },
    }),
    [],
  );

  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const data: { angle: number; radius: number; speed: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.sin(i * 53.13) * Math.PI * 2;
      const radius = 1.2 + (Math.sin(i * 17.7) * 0.5 + 0.5) * 2.6;
      data.push({ angle, radius, speed: 0.6 + (Math.sin(i * 7.3) * 0.5 + 0.5) });
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = 0;
    }
    return { positions, data };
  }, []);

  useFrame((state, delta) => {
    const progress = THREE.MathUtils.clamp(introRef.current, 0, 1);
    const fade =
      Math.min(1, progress / 0.12) * (1 - THREE.MathUtils.smoothstep(progress, 0.62, 0.82));

    if (diskRef.current) {
      diskRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      diskRef.current.uniforms.uProgress.value = progress;
      diskRef.current.uniforms.uFade.value = fade;
    }
    if (coreRef.current) coreRef.current.opacity = fade;
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.3;
      const scale = 0.85 + progress * 0.5;
      groupRef.current.scale.setScalar(scale);
      groupRef.current.visible = fade > 0.001;
    }

    const points = pointsRef.current;
    if (points) {
      const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const array = attr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const d = particles.data[i];
        d.angle += delta * d.speed * (1.4 / d.radius);
        d.radius -= delta * d.speed * (0.25 + progress * 0.9);
        if (d.radius < CORE_RADIUS) d.radius = 3.8;
        array[i * 3] = Math.cos(d.angle) * d.radius;
        array[i * 3 + 1] = Math.sin(d.angle) * d.radius;
      }
      attr.needsUpdate = true;
      const mat = points.material as THREE.PointsMaterial;
      mat.opacity = fade * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[CORE_RADIUS, 64]} />
        <meshBasicMaterial ref={coreRef} color="#000000" transparent toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[DISK_SIZE, DISK_SIZE]} />
        <shaderMaterial
          ref={diskRef}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#cfe6ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
