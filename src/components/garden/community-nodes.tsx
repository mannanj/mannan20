"use client";

import { useEffect, useRef } from "react";

const SPAWN_MIN_MS = 16500;
const SPAWN_MAX_MS = 40000;
const ROW_SPACING = 30.5;
const ROW_PADDING_TOP = 11;
const TARGET_COL_SPACING = 124;
const MAX_DT = 32;
const NODE_RADIUS_MIN = 0.84;
const NODE_RADIUS_MAX = 2.2;
const PARTICLE_RADIUS = 0.375;
const HIT_GLOW_RADIUS = 10;
const HIT_GLOW_DECAY = 600;
const BOUNCE_CHANCE = 0.33;
const BOUNCE_DELAY_MIN = 1100;
const BOUNCE_DELAY_MAX = 3300;
const PARTICLE_SPEED_MIN = 0.008;
const PARTICLE_SPEED_MAX = 0.031;
const PARTICLE_LIFE_MS = 30000;
const PARTICLE_FADE_MS = 1200;
const TRAIL_DURATION_MS = 500;
const COLLISION_PADDING = 0;
const SOURCE_IGNORE_MS = 50;
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
      nodes.push({
        x: startX + i * spacing + jitterX + nudgeX,
        y: y + jitterY,
        row: r,
        baseAlpha: 0.2 + rand() * 0.2,
        radius: NODE_RADIUS_MIN + Math.random() * (NODE_RADIUS_MAX - NODE_RADIUS_MIN),
        color: Math.random() < 2 / 3 ? NODE_COLORS[0] : NODE_COLORS[1 + Math.floor(Math.random() * 3)],
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

export function CommunityNodes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const nodes = generateTreeNodes(width, height);
    const edges = generateTreeEdges(nodes);
    const particles: Particle[] = [];
    const nodeHits: { time: number }[][] = nodes.map(() => []);
    const pendingBounces: PendingBounce[] = [];
    let lastTime = 0;
    let nextSpawn = 3000;
    let spawnTimer = 0;
    let initialEmitFired = false;

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
      });
    };

    const animate = (timestamp: number) => {
      if (lastTime === 0) lastTime = timestamp;
      const rawDt = timestamp - lastTime;
      const dt = Math.min(rawDt, MAX_DT);
      lastTime = timestamp;

      const emitFromRandomNode = () => {
        const sourceIdx = Math.floor(Math.random() * nodes.length);
        const wideBurst = Math.random() < 0.2;
        const count = wideBurst
          ? 5 + Math.floor(Math.random() * 3)
          : 3 + Math.floor(Math.random() * 2);
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
            p.hitFired = true;
            p.stoppedAt = timestamp;
            p.x = node.x;
            p.y = node.y;
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
          } else if (p.travelMs > PARTICLE_LIFE_MS) {
            particles.splice(i, 1);
            continue;
          }
        }

        if (p.hitFired && timestamp - p.stoppedAt > PARTICLE_FADE_MS) {
          particles.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.lineWidth = 0.4;
      for (const [a, b] of edges) {
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
      ctx.restore();

      for (let i = 0; i < nodes.length; i++) {
        const alpha = nodes[i].baseAlpha;
        const [nr, ng, nb] = nodes[i].color;
        ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, nodes[i].radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      for (const p of particles) {
        const trailTravel = Math.max(0, p.travelMs - TRAIL_DURATION_MS);
        const tx = p.startX + p.vx * trailTravel;
        const ty = p.startY + p.vy * trailTravel;

        const ghostFade = p.hitFired
          ? Math.max(0, 1 - (timestamp - p.stoppedAt) / PARTICLE_FADE_MS)
          : 1;

        const trailAlpha = (p.hitFired ? 0.14 : 0.28) * ghostFade;
        const [pr, pg, pb] = p.color;
        const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
        grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0)`);
        grad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, ${trailAlpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (!p.hitFired) {
          const fadeIn = Math.min(p.travelMs / 120, 1);
          const opacity = fadeIn * 0.9;
          ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} />
    </div>
  );
}
