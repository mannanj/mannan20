"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

const RIM_COLOR = "#f97316";
const VERTEX_COLOR = "#fb923c";
const BODY_COLOR = "#1a1a1a";
const PARTICLE_COLOR = "#f59e0b";

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Icosahedron() {
  const groupRef = useRef<THREE.Group>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const vertexMaterialsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const reduced = usePrefersReducedMotion();

  const { edgesGeometry, vertexPositions } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const edges = new THREE.EdgesGeometry(geo);
    const attr = geo.attributes.position;
    const seen = new Set<string>();
    const verts: [number, number, number][] = [];
    for (let i = 0; i < attr.count; i++) {
      const v: [number, number, number] = [attr.getX(i), attr.getY(i), attr.getZ(i)];
      const key = v.map((n) => n.toFixed(3)).join(",");
      if (!seen.has(key)) {
        seen.add(key);
        verts.push(v);
      }
    }
    geo.dispose();
    return { edgesGeometry: edges, vertexPositions: verts };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || reduced) return;
    groupRef.current.rotation.y += delta * 0.35;
    groupRef.current.rotation.x += delta * 0.08;

    const t = state.clock.elapsedTime;
    if (lineMaterialRef.current) {
      lineMaterialRef.current.color.setHSL((t * 0.12) % 1, 0.85, 0.6);
    }
    const count = vertexMaterialsRef.current.length || 1;
    for (let i = 0; i < vertexMaterialsRef.current.length; i++) {
      const mat = vertexMaterialsRef.current[i];
      if (mat) mat.color.setHSL((t * 0.12 + i / count) % 1, 0.9, 0.7);
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.15} floatIntensity={0.25}>
      <group ref={groupRef}>
        <mesh>
          <icosahedronGeometry args={[0.98, 0]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            metalness={0.35}
            roughness={0.45}
          />
        </mesh>
        <lineSegments>
          <primitive object={edgesGeometry} attach="geometry" />
          <lineBasicMaterial ref={lineMaterialRef} transparent opacity={0.85} />
        </lineSegments>
        {vertexPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshBasicMaterial
              ref={(m) => {
                vertexMaterialsRef.current[i] = m;
              }}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function AtmosphereParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const reduced = usePrefersReducedMotion();

  const positions = useMemo(() => {
    const count = 80;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || reduced) return;
    pointsRef.current.rotation.y += delta * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={PARTICLE_COLOR}
        transparent
        opacity={0.45}
        sizeAttenuation
      />
    </points>
  );
}

export default function CommunityConstellation() {
  return (
    <div className="w-[52px] h-[52px]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute("data-magnifiable", "");
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 2, 2]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-2, -1, 2.5]} intensity={0.4} color="#ffffff" />
        <Icosahedron />
        <AtmosphereParticles />
      </Canvas>
    </div>
  );
}
