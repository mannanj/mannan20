"use client";

import { useEffect, useRef } from "react";

const SPAWN_MIN_MS = 66000;
const SPAWN_MAX_MS = 160000;
const EXTERNAL_SPAWN_MIN_MS = 12000;
const EXTERNAL_SPAWN_MAX_MS = 28000;
const METEOR_SMALL_MIN = 0.25;
const METEOR_SMALL_MAX = 0.4;
const METEOR_BASE_MIN = 0.4;
const METEOR_BASE_MAX = 0.6;
const METEOR_LARGE_MIN = 0.6;
const METEOR_LARGE_MAX = 0.9;
const COMET_CHANCE = 0.08;
const COMET_RADIUS_MIN = 1.0;
const COMET_RADIUS_MAX = 1.4;
const MEGA_COMET_CHANCE_OF_COMETS = 0.5;
const MEGA_COMET_RADIUS_MIN = 2.0;
const MEGA_COMET_RADIUS_MAX = 2.8;
const COMET_TRAIL_DURATION_MS = 1200;
const COMET_TRAIL_COLOR: [number, number, number] = [170, 220, 255];
const ROW_SPACING = 30.5;
const ROW_PADDING_TOP = 11;
const TARGET_COL_SPACING = 124;
const MAX_DT = 32;
const NODE_TIER_TINY_MIN = 0.35;
const NODE_TIER_TINY_MAX = 0.55;
const NODE_TIER_BASE_MIN = 0.55;
const NODE_TIER_BASE_MAX = 0.75;
const NODE_TIER_MID_MIN = 0.75;
const NODE_TIER_MID_MAX = 1.25;
const NODE_TIER_LARGE_MIN = 1.25;
const NODE_TIER_LARGE_MAX = 1.75;
const NODE_TIER_XL_MIN = 1.75;
const NODE_TIER_XL_MAX = 2.25;
const PARTICLE_RADIUS = 0.22;
const HIT_GLOW_RADIUS = 10;
const HIT_GLOW_DECAY = 600;
const BOUNCE_CHANCE = 0.33;
const BOUNCE_DELAY_MIN = 4400;
const BOUNCE_DELAY_MAX = 13200;
const PARTICLE_SPEED_MIN = 0.008;
const PARTICLE_SPEED_MAX = 0.031;
const PARTICLE_LIFE_MS = 30000;
const PARTICLE_FADE_MS = 1200;
const TRAIL_DURATION_MS = 500;
const COLLISION_PADDING = 0;
const SOURCE_IGNORE_MS = 50;
const GALAXY_SPIN_SPEED = 0.00038;
const GALAXY_HALO_SCALE = 4.2;
const GALAXY_HALO_SQUASH = 0.42;
const GALAXY_CORE_SCALE = 1.25;
const SUN_CORONA_SCALE = 4.5;
const SUN_CORONA_PULSE_SPEED = 0.0005;
const SUN_CORONA_PULSE_AMP = 0.08;
const SUN_CORE_SCALE = 1.2;
const SUN_INNER_PULSE_SPEED = 0.0013;
const SUN_INNER_PULSE_AMP = 0.04;
const DUST_TINY_COUNT_MULTIPLIER = 4.35;
const DUST_TINY_RADIUS_MIN = 0.11;
const DUST_TINY_RADIUS_MAX = 0.35;
const DUST_COUNT_MULTIPLIER = 3.6;
const DUST_RADIUS_MIN = 0.35;
const DUST_RADIUS_MAX = 0.55;
const DUST_MID_COUNT_MULTIPLIER = 0.75;
const DUST_MID_RADIUS_MIN = 0.55;
const DUST_MID_RADIUS_MAX = 0.75;
const NODE_COLORS: [number, number, number][] = [
  [255, 255, 255],
  [248, 113, 113],
  [74, 222, 128],
  [3, 155, 229],
];

interface Node {
  x: number;
  y: number;
  row: number;
  baseAlpha: number;
  radius: number;
  color: [number, number, number];
  isGalaxy: boolean;
  galaxyPhase: number;
  isSun: boolean;
  sunPhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  spawnTime: number;
  travelMs: number;
  hitFired: boolean;
  stoppedAt: number;
  color: [number, number, number];
  bounceGen: number;
  sourceNodeIndex: number;
  lastCollisionNode: number;
  radius: number;
  isComet: boolean;
  passthroughRemaining: number;
}

interface PendingBounce {
  sourceNodeIndex: number;
  color: [number, number, number];
  spawnAt: number;
  bounceGen: number;
}

function generateTreeNodes(width: number, height: number): Node[] {
  const nodes: Node[] = [];
  const usableHeight = height - ROW_PADDING_TOP - 12;
  const rowCount = Math.max(4, Math.floor(usableHeight / ROW_SPACING) + 1);
  const baseCount = Math.max(5, Math.round((width - 8) / TARGET_COL_SPACING) + 1);
  const rows: { count: number; y: number }[] = [];
  for (let r = 0; r < rowCount; r++) {
    const count = r % 2 === 0 ? baseCount : baseCount + 2;
    rows.push({ count, y: ROW_PADDING_TOP + r * ROW_SPACING });
  }

  let seed = 73;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows.length; r++) {
    const { count, y } = rows[r];
    const totalSpread = width - 8;
    const spacing = totalSpread / (count - 1 || 1);
    const startX = 4;

    for (let i = 0; i < count; i++) {
      const jitterX = (rand() - 0.5) * spacing * 0.4;
      const jitterY = (rand() - 0.5) * 6;
      const nudgeX = (Math.random() - 0.5) * 8.4;
      const tierRoll = Math.random();
      let radius: number;
      let isGalaxy = false;
      let isSun = false;
      if (tierRoll < 0.79) {
        radius = NODE_TIER_TINY_MIN + Math.random() * (NODE_TIER_TINY_MAX - NODE_TIER_TINY_MIN);
      } else if (tierRoll < 0.95) {
        radius = NODE_TIER_BASE_MIN + Math.random() * (NODE_TIER_BASE_MAX - NODE_TIER_BASE_MIN);
      } else if (tierRoll < 0.99) {
        radius = NODE_TIER_MID_MIN + Math.random() * (NODE_TIER_MID_MAX - NODE_TIER_MID_MIN);
      } else if (tierRoll < 0.998) {
        radius = NODE_TIER_LARGE_MIN + Math.random() * (NODE_TIER_LARGE_MAX - NODE_TIER_LARGE_MIN);
        isGalaxy = true;
      } else {
        radius = NODE_TIER_XL_MIN + Math.random() * (NODE_TIER_XL_MAX - NODE_TIER_XL_MIN);
        isSun = true;
      }
      nodes.push({
        x: startX + i * spacing + jitterX + nudgeX,
        y: y + jitterY,
        row: r,
        baseAlpha: 0.2 + rand() * 0.2,
        radius,
        color: Math.random() < 2 / 3 ? NODE_COLORS[0] : NODE_COLORS[1 + Math.floor(Math.random() * 3)],
        isGalaxy,
        galaxyPhase: Math.random() * Math.PI * 2,
        isSun,
        sunPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  return nodes;
}

function generateTreeEdges(nodes: Node[]): [number, number][] {
  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();

  const addEdge = (a: number, b: number) => {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!edgeSet.has(key)) {
      edges.push([Math.min(a, b), Math.max(a, b)]);
      edgeSet.add(key);
    }
  };

  const rowCount = nodes.reduce((max, n) => Math.max(max, n.row), 0) + 1;
  const rowIndices: number[][] = Array.from({ length: rowCount }, () => []);
  for (let i = 0; i < nodes.length; i++) {
    rowIndices[nodes[i].row].push(i);
  }

  for (const row of rowIndices) {
    for (let i = 0; i < row.length - 1; i++) {
      addEdge(row[i], row[i + 1]);
    }
  }

  for (let r = 0; r < rowIndices.length - 1; r++) {
    const top = rowIndices[r];
    const bottom = rowIndices[r + 1];

    for (const ti of top) {
      let bestDist = Infinity;
      let bestIdx = bottom[0];
      for (const bi of bottom) {
        const d = Math.hypot(nodes[ti].x - nodes[bi].x, nodes[ti].y - nodes[bi].y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = bi;
        }
      }
      addEdge(ti, bestIdx);
    }

    for (const bi of bottom) {
      let bestDist = Infinity;
      let bestIdx = top[0];
      for (const ti of top) {
        const d = Math.hypot(nodes[ti].x - nodes[bi].x, nodes[ti].y - nodes[bi].y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = ti;
        }
      }
      addEdge(bestIdx, bi);
    }
  }

  let seed = 99;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rowIndices.length - 1; r++) {
    const top = rowIndices[r];
    const bottom = rowIndices[r + 1];
    for (const ti of top) {
      for (const bi of bottom) {
        const d = Math.hypot(nodes[ti].x - nodes[bi].x, nodes[ti].y - nodes[bi].y);
        if (d < 150 && rand() < 0.45) {
          addEdge(ti, bi);
        }
      }
    }
  }

  for (const row of rowIndices) {
    for (let i = 0; i < row.length - 2; i++) {
      if (rand() < 0.45) addEdge(row[i], row[i + 2]);
    }
  }

  for (let r = 0; r < rowIndices.length - 2; r++) {
    const top = rowIndices[r];
    const skip = rowIndices[r + 2];
    if (!top.length || !skip.length) continue;
    for (const ti of top) {
      for (const bi of skip) {
        const d = Math.hypot(nodes[ti].x - nodes[bi].x, nodes[ti].y - nodes[bi].y);
        if (d < 140 && rand() < 0.35) {
          addEdge(ti, bi);
        }
      }
    }
  }

  return edges;
}

const VIEWPORT_CULL_MARGIN = 64;
const BAND_HEIGHT = 256;

export function CommunityNodes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let viewportW = window.innerWidth;
    let viewportH = window.innerHeight;
    const measureHeight = () =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight,
      );
    const WORLD_PAD = 2000;
    const WORLD_MAX_WIDTH = 2560;
    let worldWidth = Math.max(window.innerWidth, WORLD_MAX_WIDTH);
    let worldHeight = measureHeight() + WORLD_PAD;

    canvas.width = viewportW * dpr;
    canvas.height = viewportH * dpr;
    canvas.style.width = `${viewportW}px`;
    canvas.style.height = `${viewportH}px`;
    ctx.scale(dpr, dpr);

    const nodes: Node[] = [];
    const edges: [number, number][] = [];
    const dust: {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      color: [number, number, number];
    }[] = [];
    const nodeBands: number[][] = [];
    const edgeBands: number[][] = [];
    const dustBands: number[][] = [];
    let bandCount = 0;
    const nodeHits: { time: number }[][] = [];

    const ensureBands = (target: number) => {
      while (bandCount < target) {
        nodeBands.push([]);
        edgeBands.push([]);
        dustBands.push([]);
        bandCount++;
      }
    };

    const pickDustColor = (): [number, number, number] =>
      Math.random() < 0.1
        ? NODE_COLORS[1 + Math.floor(Math.random() * 3)]
        : NODE_COLORS[0];

    const indexNode = (i: number) => {
      const b = Math.min(bandCount - 1, Math.floor(nodes[i].y / BAND_HEIGHT));
      nodeBands[b].push(i);
    };
    const indexEdge = (i: number) => {
      const [a, b] = edges[i];
      const minY = Math.min(nodes[a].y, nodes[b].y);
      const maxY = Math.max(nodes[a].y, nodes[b].y);
      const startBand = Math.min(bandCount - 1, Math.floor(minY / BAND_HEIGHT));
      const endBand = Math.min(bandCount - 1, Math.floor(maxY / BAND_HEIGHT));
      for (let bi = startBand; bi <= endBand; bi++) edgeBands[bi].push(i);
    };
    const indexDust = (i: number) => {
      const b = Math.min(bandCount - 1, Math.floor(dust[i].y / BAND_HEIGHT));
      dustBands[b].push(i);
    };

    const extendRegion = (
      xMin: number,
      xMax: number,
      yMin: number,
      yMax: number,
      withEdges: boolean,
    ) => {
      const regionW = xMax - xMin;
      const regionH = yMax - yMin;
      if (regionW <= 0 || regionH <= 0) return;
      ensureBands(Math.ceil(yMax / BAND_HEIGHT));

      const baseIdx = nodes.length;
      const regionNodes = generateTreeNodes(regionW, regionH);
      for (let i = 0; i < regionNodes.length; i++) {
        const n = regionNodes[i];
        n.x += xMin;
        n.y += yMin;
        nodes.push(n);
        nodeHits.push([]);
        indexNode(nodes.length - 1);
      }
      if (withEdges) {
        const regionEdges = generateTreeEdges(regionNodes);
        for (let i = 0; i < regionEdges.length; i++) {
          const [a, b] = regionEdges[i];
          edges.push([a + baseIdx, b + baseIdx]);
          indexEdge(edges.length - 1);
        }
      }

      const tinyCount = Math.round(regionNodes.length * DUST_TINY_COUNT_MULTIPLIER);
      for (let i = 0; i < tinyCount; i++) {
        dust.push({
          x: xMin + Math.random() * regionW,
          y: yMin + Math.random() * regionH,
          radius: DUST_TINY_RADIUS_MIN + Math.random() * (DUST_TINY_RADIUS_MAX - DUST_TINY_RADIUS_MIN),
          alpha: 0.1 + Math.random() * 0.14,
          color: pickDustColor(),
        });
        indexDust(dust.length - 1);
      }
      const midDustCount = Math.round(regionNodes.length * DUST_COUNT_MULTIPLIER);
      for (let i = 0; i < midDustCount; i++) {
        dust.push({
          x: xMin + Math.random() * regionW,
          y: yMin + Math.random() * regionH,
          radius: DUST_RADIUS_MIN + Math.random() * (DUST_RADIUS_MAX - DUST_RADIUS_MIN),
          alpha: 0.12 + Math.random() * 0.16,
          color: pickDustColor(),
        });
        indexDust(dust.length - 1);
      }
      const largeDustCount = Math.round(regionNodes.length * DUST_MID_COUNT_MULTIPLIER);
      for (let i = 0; i < largeDustCount; i++) {
        dust.push({
          x: xMin + Math.random() * regionW,
          y: yMin + Math.random() * regionH,
          radius: DUST_MID_RADIUS_MIN + Math.random() * (DUST_MID_RADIUS_MAX - DUST_MID_RADIUS_MIN),
          alpha: 0.16 + Math.random() * 0.18,
          color: pickDustColor(),
        });
        indexDust(dust.length - 1);
      }
    };

    extendRegion(0, worldWidth, 0, worldHeight, true);
    const particles: Particle[] = [];
    const pendingBounces: PendingBounce[] = [];
    let lastTime = 0;
    let nextSpawn = 3000;
    let spawnTimer = 0;
    let initialEmitFired = false;
    let nextExternalSpawn = EXTERNAL_SPAWN_MIN_MS +
      Math.random() * (EXTERNAL_SPAWN_MAX_MS - EXTERNAL_SPAWN_MIN_MS);
    let externalTimer = 0;

    const spawnParticle = (
      sourceIdx: number,
      color: [number, number, number],
      bounceGen: number,
      timestamp: number,
    ) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = PARTICLE_SPEED_MIN +
        Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      const n = nodes[sourceIdx];
      particles.push({
        x: n.x,
        y: n.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        startX: n.x,
        startY: n.y,
        spawnTime: timestamp,
        travelMs: 0,
        hitFired: false,
        stoppedAt: 0,
        color,
        bounceGen,
        sourceNodeIndex: sourceIdx,
        lastCollisionNode: -1,
        radius: PARTICLE_RADIUS,
        isComet: false,
        passthroughRemaining: 0,
      });
    };

    let scrollY = window.scrollY;

    const spawnExternalParticle = (timestamp: number) => {
      const edge = Math.floor(Math.random() * 4);
      const viewTop = scrollY;
      const viewBottom = scrollY + viewportH;
      const isComet = Math.random() < COMET_CHANCE;
      const speed = PARTICLE_SPEED_MIN +
        Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      const color: [number, number, number] = Math.random() < 0.25
        ? NODE_COLORS[1 + Math.floor(Math.random() * 3)]
        : NODE_COLORS[0];
      let radius: number;
      let passthroughRemaining = 0;
      let particleColor = color;
      if (isComet) {
        const isMega = Math.random() < MEGA_COMET_CHANCE_OF_COMETS;
        if (isMega) {
          radius = MEGA_COMET_RADIUS_MIN + Math.random() * (MEGA_COMET_RADIUS_MAX - MEGA_COMET_RADIUS_MIN);
          passthroughRemaining = Number.POSITIVE_INFINITY;
        } else {
          radius = COMET_RADIUS_MIN + Math.random() * (COMET_RADIUS_MAX - COMET_RADIUS_MIN);
          passthroughRemaining = 2;
        }
        particleColor = COMET_TRAIL_COLOR;
      } else {
        const t = Math.random();
        if (t < 0.8) radius = METEOR_SMALL_MIN + Math.random() * (METEOR_SMALL_MAX - METEOR_SMALL_MIN);
        else if (t < 0.96) radius = METEOR_BASE_MIN + Math.random() * (METEOR_BASE_MAX - METEOR_BASE_MIN);
        else {
          radius = METEOR_LARGE_MIN + Math.random() * (METEOR_LARGE_MAX - METEOR_LARGE_MIN);
          passthroughRemaining = 1;
        }
      }
      let sx = 0, sy = 0, angle = 0;
      const offset = 12;
      if (edge === 0) {
        sx = Math.random() * viewportW;
        sy = viewTop - offset;
        angle = Math.PI / 3 + Math.random() * (Math.PI / 3);
      } else if (edge === 1) {
        sx = viewportW + offset;
        sy = viewTop + Math.random() * viewportH;
        angle = Math.PI - Math.PI / 6 + Math.random() * (Math.PI / 3);
      } else if (edge === 2) {
        sx = Math.random() * viewportW;
        sy = viewBottom + offset;
        angle = -Math.PI / 3 - Math.random() * (Math.PI / 3);
      } else {
        sx = -offset;
        sy = viewTop + Math.random() * viewportH;
        angle = -Math.PI / 6 + Math.random() * (Math.PI / 3);
      }
      particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        startX: sx,
        startY: sy,
        spawnTime: timestamp,
        travelMs: 0,
        hitFired: false,
        stoppedAt: 0,
        color: particleColor,
        bounceGen: 0,
        sourceNodeIndex: -1,
        lastCollisionNode: -1,
        radius,
        isComet,
        passthroughRemaining,
      });
    };

    const animate = (timestamp: number) => {
      if (lastTime === 0) lastTime = timestamp;
      const rawDt = timestamp - lastTime;
      const dt = Math.min(rawDt, MAX_DT);
      lastTime = timestamp;

      const emitFromRandomNode = () => {
        const sourceIdx = Math.floor(Math.random() * nodes.length);
        const count = 1 + Math.floor(Math.random() * 2);
        const color = nodes[sourceIdx].color;
        for (let k = 0; k < count; k++) {
          spawnParticle(sourceIdx, color, 0, timestamp);
        }
      };

      if (!initialEmitFired) {
        initialEmitFired = true;
        emitFromRandomNode();
        if (Math.random() < 0.25) {
          emitFromRandomNode();
          if (Math.random() < 0.2) emitFromRandomNode();
        }
      }

      externalTimer += dt;
      if (externalTimer >= nextExternalSpawn) {
        externalTimer = 0;
        nextExternalSpawn = EXTERNAL_SPAWN_MIN_MS +
          Math.random() * (EXTERNAL_SPAWN_MAX_MS - EXTERNAL_SPAWN_MIN_MS);
        spawnExternalParticle(timestamp);
      }

      spawnTimer += dt;
      if (spawnTimer >= nextSpawn) {
        spawnTimer = 0;
        nextSpawn = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
        emitFromRandomNode();
        if (Math.random() < 0.25) {
          emitFromRandomNode();
          if (Math.random() < 0.2) emitFromRandomNode();
        }
      }

      for (let i = pendingBounces.length - 1; i >= 0; i--) {
        if (timestamp >= pendingBounces[i].spawnAt) {
          const pb = pendingBounces[i];
          const burstCount = 1 + Math.floor(Math.random() * 2);
          for (let k = 0; k < burstCount; k++) {
            spawnParticle(pb.sourceNodeIndex, pb.color, pb.bounceGen, timestamp);
          }
          pendingBounces.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.hitFired) {
          p.travelMs += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          let hitNode = -1;
          let hitDistSq = Infinity;
          for (let n = 0; n < nodes.length; n++) {
            if (n === p.sourceNodeIndex && p.travelMs < SOURCE_IGNORE_MS) continue;
            if (n === p.lastCollisionNode) continue;
            const node = nodes[n];
            const dx = p.x - node.x;
            const dy = p.y - node.y;
            const r = node.radius + PARTICLE_RADIUS + COLLISION_PADDING;
            const distSq = dx * dx + dy * dy;
            if (distSq <= r * r && distSq < hitDistSq) {
              hitDistSq = distSq;
              hitNode = n;
            }
          }

          if (hitNode >= 0) {
            const node = nodes[hitNode];
            p.lastCollisionNode = hitNode;
            nodeHits[hitNode].push({ time: timestamp });

            const [pr, pg, pb] = p.color;
            const [nr, ng, nb] = node.color;
            const blended: [number, number, number] = [
              Math.round((pr + nr) / 2),
              Math.round((pg + ng) / 2),
              Math.round((pb + nb) / 2),
            ];

            if (p.bounceGen === 0 && Math.random() < 0.66) {
              pendingBounces.push({
                sourceNodeIndex: hitNode,
                color: blended,
                spawnAt: timestamp + BOUNCE_DELAY_MIN +
                  Math.random() * (BOUNCE_DELAY_MAX - BOUNCE_DELAY_MIN),
                bounceGen: 1,
              });
            } else if (p.bounceGen === 1 && Math.random() < BOUNCE_CHANCE) {
              pendingBounces.push({
                sourceNodeIndex: hitNode,
                color: blended,
                spawnAt: timestamp + BOUNCE_DELAY_MIN +
                  Math.random() * (BOUNCE_DELAY_MAX - BOUNCE_DELAY_MIN),
                bounceGen: 2,
              });
            }

            if (p.passthroughRemaining > 0) {
              p.passthroughRemaining--;
            } else {
              p.hitFired = true;
              p.stoppedAt = timestamp;
              p.x = node.x;
              p.y = node.y;
            }
          } else if (p.travelMs > PARTICLE_LIFE_MS) {
            particles.splice(i, 1);
            continue;
          }
        }

        if (p.hitFired && timestamp - p.stoppedAt > PARTICLE_FADE_MS) {
          particles.splice(i, 1);
        }
      }

      const drawScene = () => {
      const viewTop = scrollY - VIEWPORT_CULL_MARGIN;
      const viewBottom = scrollY + viewportH + VIEWPORT_CULL_MARGIN;
      const startBand = Math.max(0, Math.floor(viewTop / BAND_HEIGHT));
      const endBand = Math.min(bandCount - 1, Math.floor(viewBottom / BAND_HEIGHT));
      const seenEdges = new Set<number>();
      ctx.save();
      ctx.lineWidth = 0.4;
      for (let bi = startBand; bi <= endBand; bi++) {
        const list = edgeBands[bi];
        for (let j = 0; j < list.length; j++) {
          const ei = list[j];
          if (seenEdges.has(ei)) continue;
          seenEdges.add(ei);
          const [a, b] = edges[ei];
          const dx = nodes[b].x - nodes[a].x;
          const dy = nodes[b].y - nodes[a].y;
          const dist = Math.hypot(dx, dy);
          const alpha = Math.max(0.025, 0.06 - dist * 0.0003);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[a].x, nodes[a].y);
          ctx.lineTo(nodes[b].x, nodes[b].y);
          ctx.stroke();
        }
      }
      ctx.restore();

      for (let bi = startBand; bi <= endBand; bi++) {
        const list = dustBands[bi];
        for (let j = 0; j < list.length; j++) {
          const d = dust[list[j]];
          const [dr, dg, db] = d.color;
          ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${d.alpha})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let bi = startBand; bi <= endBand; bi++) {
        const list = nodeBands[bi];
        for (let j = 0; j < list.length; j++) {
          const i = list[j];
          const node = nodes[i];
        const [nr, ng, nb] = node.color;
        if (node.isGalaxy) {
          const angle = timestamp * GALAXY_SPIN_SPEED + node.galaxyPhase;
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(angle);
          ctx.scale(1, GALAXY_HALO_SQUASH);
          const haloR = node.radius * GALAXY_HALO_SCALE;
          const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
          halo.addColorStop(0, `rgba(${nr}, ${ng}, ${nb}, 0.28)`);
          halo.addColorStop(0.45, `rgba(${nr}, ${ng}, ${nb}, 0.14)`);
          halo.addColorStop(1, `rgba(0, 0, 0, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, 0, haloR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(-angle * 0.6);
          ctx.scale(1, GALAXY_HALO_SQUASH * 1.6);
          const innerR = node.radius * (GALAXY_HALO_SCALE * 0.55);
          const innerHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
          innerHalo.addColorStop(0, `rgba(${nr}, ${ng}, ${nb}, 0.32)`);
          innerHalo.addColorStop(1, `rgba(0, 0, 0, 0)`);
          ctx.fillStyle = innerHalo;
          ctx.beginPath();
          ctx.arc(0, 0, innerR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          const coreR = node.radius * GALAXY_CORE_SCALE;
          const core = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, coreR);
          core.addColorStop(0, `rgba(255, 245, 215, 0.95)`);
          core.addColorStop(0.5, `rgba(${nr}, ${ng}, ${nb}, 0.6)`);
          core.addColorStop(1, `rgba(0, 0, 0, 0)`);
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(node.x, node.y, coreR, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.isSun) {
          const t = timestamp;
          const outerPulse = 1 + Math.sin(t * SUN_CORONA_PULSE_SPEED + node.sunPhase) * SUN_CORONA_PULSE_AMP;
          const innerPulse = 1 + Math.sin(t * SUN_INNER_PULSE_SPEED + node.sunPhase * 0.7) * SUN_INNER_PULSE_AMP;

          ctx.save();
          ctx.globalCompositeOperation = "lighter";

          const outerR = node.radius * SUN_CORONA_SCALE * outerPulse;
          const corona = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, outerR);
          corona.addColorStop(0, "rgba(255, 180, 60, 0.0)");
          corona.addColorStop(0.25, "rgba(255, 140, 40, 0.22)");
          corona.addColorStop(0.6, "rgba(255, 80, 30, 0.1)");
          corona.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = corona;
          ctx.beginPath();
          ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2);
          ctx.fill();

          const midR = node.radius * 2.4 * innerPulse;
          const mid = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, midR);
          mid.addColorStop(0, "rgba(255, 230, 150, 0.55)");
          mid.addColorStop(0.5, "rgba(255, 150, 50, 0.22)");
          mid.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.arc(node.x, node.y, midR, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          const coreR = node.radius * SUN_CORE_SCALE;
          const core = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, coreR);
          core.addColorStop(0, "rgba(255, 248, 220, 1.0)");
          core.addColorStop(0.55, "rgba(255, 190, 90, 0.95)");
          core.addColorStop(1, "rgba(255, 110, 40, 0.6)");
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(node.x, node.y, coreR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const alpha = node.baseAlpha;
          ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        }
      }

      ctx.save();
      for (const p of particles) {
        const trailDuration = p.isComet ? COMET_TRAIL_DURATION_MS : TRAIL_DURATION_MS;
        const trailTravel = Math.max(0, p.travelMs - trailDuration);
        const tx = p.startX + p.vx * trailTravel;
        const ty = p.startY + p.vy * trailTravel;

        const ghostFade = p.hitFired
          ? Math.max(0, 1 - (timestamp - p.stoppedAt) / PARTICLE_FADE_MS)
          : 1;

        const baseTrailAlpha = p.isComet ? 0.5 : 0.28;
        const trailAlpha = (p.hitFired ? baseTrailAlpha * 0.5 : baseTrailAlpha) * ghostFade;
        const [pr, pg, pb] = p.isComet ? COMET_TRAIL_COLOR : p.color;
        const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
        grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0)`);
        grad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, ${trailAlpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.isComet ? 2.4 : 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (!p.hitFired) {
          const fadeIn = Math.min(p.travelMs / 120, 1);
          const opacity = fadeIn * (p.isComet ? 1 : 0.9);
          const [hr, hg, hb] = p.isComet ? COMET_TRAIL_COLOR : p.color;
          ctx.fillStyle = `rgba(${hr}, ${hg}, ${hb}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          if (p.isComet) {
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
            glow.addColorStop(0, `rgba(${COMET_TRAIL_COLOR[0]}, ${COMET_TRAIL_COLOR[1]}, ${COMET_TRAIL_COLOR[2]}, ${opacity * 0.45})`);
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
      };

      ctx.clearRect(0, 0, viewportW, viewportH);
      ctx.save();
      ctx.translate(0, -scrollY);
      drawScene();
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onResize = () => {
      viewportW = window.innerWidth;
      viewportH = window.innerHeight;
      canvas.width = viewportW * dpr;
      canvas.height = viewportH * dpr;
      canvas.style.width = `${viewportW}px`;
      canvas.style.height = `${viewportH}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      growWorld();
    };

    const growWorld = () => {
      const newH = measureHeight();
      if (newH > worldHeight - WORLD_PAD / 2) {
        const target = newH + WORLD_PAD;
        extendRegion(0, worldWidth, worldHeight, target, false);
        worldHeight = target;
      }
      if (window.innerWidth > worldWidth) {
        extendRegion(worldWidth, window.innerWidth, 0, worldHeight, false);
        worldWidth = window.innerWidth;
      }
    };

    const docObserver = new ResizeObserver(() => growWorld());
    docObserver.observe(document.documentElement);
    if (document.body) docObserver.observe(document.body);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      docObserver.disconnect();
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-magnifiable
        className="block fixed inset-0 z-0 pointer-events-none"
      />
    </>
  );
}
