"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { CARD_ASPECT, getCardTexture } from "./card-texture";
import type { SphereTile } from "./gallery-data";
import type { OrbitState } from "./use-orbit-controls";
import { getGallerySound } from "./gallery-sound";

const CARD_W = 1.55;
const CARD_H = CARD_W / CARD_ASPECT;
const HOVER_LIFT = 0.55;
const HOVER_SCALE = 1.12;

interface SceneEnv {
  reveal: number;
  radius: number;
}

interface ProductCardMeshProps {
  tile: SphereTile;
  envRef: React.RefObject<SceneEnv>;
  orbit: React.RefObject<OrbitState>;
  reducedMotion: boolean;
  onOpen: (tile: SphereTile) => void;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function ProductCardMesh({
  tile,
  envRef,
  orbit,
  reducedMotion,
  onOpen,
}: ProductCardMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mainRef = useRef<THREE.MeshBasicMaterial>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const hovered = useRef(false);
  const hoverAmount = useRef(0);

  const texture = useMemo(() => getCardTexture(tile.product), [tile.product]);

  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(-tile.dir[0], -tile.dir[1], -tile.dir[2]).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
  }, [tile.dir]);

  const dir = useMemo(
    () => new THREE.Vector3(tile.dir[0], tile.dir[1], tile.dir[2]).normalize(),
    [tile.dir],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const env = envRef.current;
    const reveal = easeOutCubic(THREE.MathUtils.clamp(env.reveal, 0, 1));

    const target = hovered.current ? 1 : 0;
    hoverAmount.current += (target - hoverAmount.current) * Math.min(1, delta * 10);

    const lift = hoverAmount.current * HOVER_LIFT;
    const float = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * 0.5 + tile.phase) * 0.06;
    const dist = env.radius - lift + float;
    group.position.copy(dir).multiplyScalar(dist);

    const scale = tile.scale * reveal * (1 + hoverAmount.current * (HOVER_SCALE - 1));
    group.scale.setScalar(scale);

    if (mainRef.current) mainRef.current.opacity = reveal;
    if (glowRef.current) glowRef.current.opacity = reveal * hoverAmount.current * 0.6;
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (hovered.current) return;
    hovered.current = true;
    document.body.style.cursor = "pointer";
    getGallerySound().hover();
  };

  const handleOut = () => {
    hovered.current = false;
    document.body.style.cursor = "";
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (orbit.current?.moved) return;
    onOpen(tile);
    getGallerySound().select();
  };

  return (
    <group ref={groupRef} quaternion={quaternion}>
      <mesh position={[0, 0, -0.02]} scale={1.08}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial
          ref={glowRef}
          color={tile.product.accent}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial
          ref={mainRef}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export type { SceneEnv };
