'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { NarrativeChapter, DownloadLink } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';

interface NarrativeDeepDiveProps {
  chapters: NarrativeChapter[];
  downloads: DownloadLink[];
  onClose: () => void;
}

const CHAPTER_COLORS = [
  new THREE.Color('#039be5'),
  new THREE.Color('#4fc3f7'),
  new THREE.Color('#0277bd'),
  new THREE.Color('#00acc1'),
];

function Particles({ count, chapterIndex }: { count: number; chapterIndex: number }) {
  const mesh = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.02;
    mesh.current.rotation.x += delta * 0.01;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length]}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function FloatingShape({ position, shape, chapterIndex }: {
  position: [number, number, number];
  shape: 'icosahedron' | 'torusKnot' | 'octahedron';
  chapterIndex: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    targetRotation.current = {
      x: chapterIndex * 0.5,
      y: chapterIndex * 0.8,
    };
  }, [chapterIndex]);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.15;
    mesh.current.rotation.y += delta * 0.1;
  });

  const geometry = useMemo(() => {
    switch (shape) {
      case 'icosahedron': return <icosahedronGeometry args={[1, 0]} />;
      case 'torusKnot': return <torusKnotGeometry args={[0.6, 0.2, 64, 16]} />;
      case 'octahedron': return <octahedronGeometry args={[0.8, 0]} />;
    }
  }, [shape]);

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={mesh} position={position}>
        {geometry}
        <meshStandardMaterial
          color={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length]}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </Float>
  );
}

function Scene({ chapterIndex }: { chapterIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);

  useEffect(() => {
    targetRotation.current = chapterIndex * Math.PI * 0.15;
  }, [chapterIndex]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += (targetRotation.current - groupRef.current.rotation.y) * delta * 0.8;
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight
        position={[5, 5, 5]}
        intensity={1.2}
        color={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length]}
      />
      <pointLight
        position={[-3, -3, 2]}
        intensity={0.5}
        color="#4fc3f7"
      />
      <group ref={groupRef}>
        <FloatingShape position={[-3, 2, -2]} shape="icosahedron" chapterIndex={chapterIndex} />
        <FloatingShape position={[3, -1, -3]} shape="torusKnot" chapterIndex={chapterIndex} />
        <FloatingShape position={[0, 3, -4]} shape="octahedron" chapterIndex={chapterIndex} />
        <FloatingShape position={[-2, -2, -5]} shape="icosahedron" chapterIndex={chapterIndex} />
        <FloatingShape position={[4, 1, -6]} shape="torusKnot" chapterIndex={chapterIndex} />
      </group>
      <Particles count={500} chapterIndex={chapterIndex} />
    </>
  );
}

function ChapterTitle({ title, chapterIndex }: { title: string; chapterIndex: number }) {
  return (
    <Text
      position={[0, 2.5, -3]}
      fontSize={0.5}
      color={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length].getStyle()}
      anchorX="center"
      anchorY="middle"
      maxWidth={8}
    >
      {title}
      <meshStandardMaterial
        emissive={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length]}
        emissiveIntensity={0.5}
        color={CHAPTER_COLORS[chapterIndex % CHAPTER_COLORS.length]}
      />
    </Text>
  );
}

export default function NarrativeDeepDive({ chapters, downloads, onClose }: NarrativeDeepDiveProps) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const touchStart = useRef<number | null>(null);

  const chapter = chapters[chapterIndex];
  const isLastChapter = chapterIndex === chapters.length - 1;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onClose(), 400);
  }, [onClose]);

  const goNext = useCallback(() => {
    if (chapterIndex < chapters.length - 1) setChapterIndex(i => i + 1);
  }, [chapterIndex, chapters.length]);

  const goPrev = useCallback(() => {
    if (chapterIndex > 0) setChapterIndex(i => i - 1);
  }, [chapterIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  };

  const handleContactClick = useCallback(() => {
    handleClose();
    setTimeout(() => scrollToSection('contact'), 500);
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-[999] bg-[#0b0b0b] transition-opacity duration-400 ${visible && !exiting ? 'opacity-100' : 'opacity-0'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-6 left-6 z-[1001] text-white/70 hover:text-white text-sm cursor-pointer bg-transparent border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-all duration-200"
      >
        &larr; Back
      </button>

      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 60 }}
          gl={{ alpha: true, antialias: true }}
        >
          <color attach="background" args={['#0b0b0b']} />
          <Scene chapterIndex={chapterIndex} />
          <ChapterTitle title={chapter.title} chapterIndex={chapterIndex} />
        </Canvas>
      </div>

      <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-end pb-[15vh] px-6 pointer-events-none">
        <div className="max-w-lg w-full text-center pointer-events-auto">
          <p className="text-white/90 text-sm md:text-base leading-relaxed mb-4">
            {chapter.content}
          </p>
          {chapter.highlight && (
            <p className="text-[#4fc3f7] text-xs md:text-sm italic">
              {chapter.highlight}
            </p>
          )}

          {isLastChapter && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex gap-4">
                {downloads.map((dl) => (
                  <a
                    key={dl.filename}
                    href={dl.path}
                    download={dl.filename}
                    className="text-[#039be5] hover:text-[#4fc3f7] text-sm border border-[#039be5]/40 hover:border-[#4fc3f7]/60 px-4 py-2 rounded transition-all duration-200 no-underline"
                  >
                    {dl.label}
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={handleContactClick}
                className="nav-button mt-2 pointer-events-auto"
              >
                Get In Touch
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 mt-8 pointer-events-auto">
          <button
            type="button"
            onClick={goPrev}
            disabled={chapterIndex === 0}
            className="text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-default text-2xl cursor-pointer bg-transparent border-none transition-colors duration-200"
          >
            &larr;
          </button>
          <div className="flex gap-2">
            {chapters.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setChapterIndex(i)}
                className={`w-2 h-2 rounded-full border-none cursor-pointer transition-all duration-300 ${
                  i === chapterIndex
                    ? 'bg-[#039be5] scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={isLastChapter}
            className="text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-default text-2xl cursor-pointer bg-transparent border-none transition-colors duration-200"
          >
            &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
