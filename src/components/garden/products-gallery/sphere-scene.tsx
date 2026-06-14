"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ProductCardMesh, type SceneEnv } from "./product-card-mesh";
import { BlackHole } from "./black-hole";
import { setCardAnisotropy } from "./card-texture";
import type { SphereTile } from "./gallery-data";
import type { OrbitState } from "./use-orbit-controls";

const BASE_RADIUS = 6.3;
const INTRO_START_Z = 6;
const INTRO_END_Z = 0.3;
const INTRO_SECONDS = 2;
const STAR_COUNT = 600;

interface SphereSceneProps {
  tiles: SphereTile[];
  orbit: React.RefObject<OrbitState>;
  introRef: React.RefObject<number>;
  introActiveRef: React.RefObject<boolean>;
  reducedMotion: boolean;
  onOpen: (tile: SphereTile) => void;
}

function easeInCubic(t: number) {
  return t * t * t;
}

function Starfield({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const v = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(22 + Math.sin(i * 3.3) * 10);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#8aa0c8"
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export function SphereScene({
  tiles,
  orbit,
  introRef,
  introActiveRef,
  reducedMotion,
  onOpen,
}: SphereSceneProps) {
  const worldRef = useRef<THREE.Group>(null);
  const envRef = useRef<SceneEnv>({ reveal: 0, radius: BASE_RADIUS });
  const introStart = useRef(-1);
  const warmup = useRef(0);
  const { camera, gl } = useThree();

  useEffect(() => {
    setCardAnisotropy(gl.capabilities.getMaxAnisotropy());
  }, [gl]);

  useFrame((state, delta) => {
    const o = orbit.current;
    if (!o) return;
    o.integrate(delta, state.clock.elapsedTime, reducedMotion);

    const world = worldRef.current;
    if (world) {
      world.rotation.x = o.pitch;
      world.rotation.y = o.yaw;
    }

    if (introActiveRef.current && introStart.current < 0) {
      if (warmup.current >= 4 && delta < 0.05) {
        introStart.current = state.clock.elapsedTime;
      } else {
        warmup.current += 1;
        introRef.current = 0;
      }
    } else if (introActiveRef.current) {
      const p = THREE.MathUtils.clamp(
        (state.clock.elapsedTime - introStart.current) / INTRO_SECONDS,
        0,
        1,
      );
      introRef.current = p;
      if (p >= 1) introActiveRef.current = false;
    }

    const progress = THREE.MathUtils.clamp(introRef.current, 0, 1);
    const reveal = THREE.MathUtils.smoothstep(progress, 0.66, 1);
    envRef.current.reveal = reveal;
    envRef.current.radius = THREE.MathUtils.lerp(7.6, BASE_RADIUS, reveal);

    const cam = camera as THREE.PerspectiveCamera;
    if (progress < 0.62) {
      const t = easeInCubic(progress / 0.62);
      cam.position.set(0, 0, THREE.MathUtils.lerp(INTRO_START_Z, INTRO_END_Z, t));
      cam.lookAt(0, 0, -2);
    } else if (cam.position.lengthSq() > 1e-6) {
      cam.position.set(0, 0, 0);
      cam.lookAt(0, 0, -1);
    }

    if (Math.abs(cam.fov - o.fov) > 0.001) {
      cam.fov = o.fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <color attach="background" args={["#050507"]} />
      <fog attach="fog" args={["#050507", 14, 30]} />
      <Starfield reducedMotion={reducedMotion} />
      <BlackHole introRef={introRef} />
      <group ref={worldRef}>
        {tiles.map((tile) => (
          <ProductCardMesh
            key={tile.id}
            tile={tile}
            envRef={envRef}
            orbit={orbit}
            reducedMotion={reducedMotion}
            onOpen={onOpen}
          />
        ))}
      </group>
    </>
  );
}
