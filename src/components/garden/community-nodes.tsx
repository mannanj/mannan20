"use client";

import { useEffect, useRef } from "react";

const HEIGHT = 60;
const SPAWN_MIN_MS = 450;
const SPAWN_MAX_MS = 1050;
const PARTICLE_DURATION_MIN = 200;
const PARTICLE_DURATION_MAX = 1100;
const MAX_DT = 32;
const NODE_RADIUS = 2.1;
const PARTICLE_RADIUS = 0.8;
const HIT_GLOW_RADIUS = 10;
const HIT_GLOW_DECAY = 600;

interface Node {
  x: number;
  y: number;
  row: number;
}

interface Particle {
  edgeIndex: number;
  progress: number;
  duration: number;
  elapsed: number;
  baseHue: number;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function generateTreeNodes(width: number): Node[] {
  const nodes: Node[] = [];
  const rows = [
    { count: 5, y: 11 },
    { count: 7, y: 29 },
    { count: 5, y: 47 },
  ];

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
      const jitterY = (rand() - 0.5) * 5;
      nodes.push({
        x: startX + i * spacing + jitterX,
        y: y + jitterY,
        row: r,
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

  const rowIndices: number[][] = [[], [], []];
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
        if (d < 90 && rand() < 0.6) {
          addEdge(ti, bi);
        }
      }
    }
  }

  for (const row of rowIndices) {
    for (let i = 0; i < row.length - 2; i++) {
      if (rand() < 0.4) addEdge(row[i], row[i + 2]);
    }
  }

  if (rowIndices[0].length > 0 && rowIndices[2].length > 0) {
    for (const ti of rowIndices[0]) {
      for (const bi of rowIndices[2]) {
        const d = Math.hypot(nodes[ti].x - nodes[bi].x, nodes[ti].y - nodes[bi].y);
        if (d < 80 && rand() < 0.25) {
          addEdge(ti, bi);
        }
      }
    }
  }

  return edges;
}

function getNeighborEdges(
  nodeIndex: number,
  edges: [number, number][]
): number[] {
  const result: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    if (edges[i][0] === nodeIndex || edges[i][1] === nodeIndex) {
      result.push(i);
    }
  }
  return result;
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

    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const nodes = generateTreeNodes(width);
    const edges = generateTreeEdges(nodes);
    const particles: Particle[] = [];
    const nodeHits: { hue: number; time: number }[][] = nodes.map(() => []);
    let lastTime = 0;
    let nextSpawn = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
    let spawnTimer = 0;

    const animate = (timestamp: number) => {
      if (lastTime === 0) lastTime = timestamp;
      const rawDt = timestamp - lastTime;
      const dt = Math.min(rawDt, MAX_DT);
      lastTime = timestamp;

      spawnTimer += dt;
      if (spawnTimer >= nextSpawn) {
        spawnTimer = 0;
        nextSpawn = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
        const sourceNode = Math.floor(Math.random() * nodes.length);
        const neighborEdges = getNeighborEdges(sourceNode, edges);
        const baseHue = Math.random() * 360;
        for (const edgeIdx of neighborEdges) {
          const needsFlip = edges[edgeIdx][0] !== sourceNode;
          particles.push({
            edgeIndex: needsFlip ? -(edgeIdx + 1) : edgeIdx,
            progress: 0,
            duration:
              PARTICLE_DURATION_MIN +
              Math.random() * (PARTICLE_DURATION_MAX - PARTICLE_DURATION_MIN),
            elapsed: 0,
            baseHue,
          });
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].elapsed += dt;
        particles[i].progress = Math.min(
          particles[i].elapsed / particles[i].duration,
          1
        );
        if (particles[i].progress >= 1) {
          const rawIdx = particles[i].edgeIndex;
          const reversed = rawIdx < 0;
          const edgeIdx = reversed ? -(rawIdx + 1) : rawIdx;
          const [a, b] = edges[edgeIdx];
          const destNode = reversed ? a : b;
          const hue = (particles[i].baseHue + 40) % 360;
          nodeHits[destNode].push({ hue, time: timestamp });
          particles.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, width, HEIGHT);

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
        const hits = nodeHits[i];
        for (let h = hits.length - 1; h >= 0; h--) {
          if (timestamp - hits[h].time > HIT_GLOW_DECAY) {
            hits.splice(h, 1);
          }
        }

        let hitAlpha = 0;
        let hitHue = 0;
        for (const hit of hits) {
          const age = (timestamp - hit.time) / HIT_GLOW_DECAY;
          const a = 1 - age;
          if (a > hitAlpha) {
            hitAlpha = a;
            hitHue = hit.hue;
          }
        }

        if (hitAlpha > 0.01) {
          const r = HIT_GLOW_RADIUS * (0.8 + hitAlpha * 0.2);
          const fog = ctx.createRadialGradient(
            nodes[i].x, nodes[i].y, 0,
            nodes[i].x, nodes[i].y, r
          );
          fog.addColorStop(0, `hsla(${hitHue}, 40%, 75%, ${hitAlpha * 0.15})`);
          fog.addColorStop(0.5, `hsla(${hitHue}, 40%, 75%, ${hitAlpha * 0.08})`);
          fog.addColorStop(1, "hsla(0, 0%, 0%, 0)");
          ctx.fillStyle = fog;
          ctx.beginPath();
          ctx.arc(nodes[i].x, nodes[i].y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const hits = nodeHits[i];
        let hitAlpha = 0;
        for (const hit of hits) {
          const age = (timestamp - hit.time) / HIT_GLOW_DECAY;
          const a = 1 - age;
          if (a > hitAlpha) hitAlpha = a;
        }
        const alpha = 0.4 + hitAlpha * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      for (const p of particles) {
        const rawIdx = p.edgeIndex;
        const reversed = rawIdx < 0;
        const edgeIdx = reversed ? -(rawIdx + 1) : rawIdx;
        const [a, b] = edges[edgeIdx];
        const fromNode = reversed ? nodes[b] : nodes[a];
        const toNode = reversed ? nodes[a] : nodes[b];
        const t = easeInOutQuad(p.progress);
        const x = fromNode.x + (toNode.x - fromNode.x) * t;
        const y = fromNode.y + (toNode.y - fromNode.y) * t;
        const fadeIn = Math.min(p.progress * 4, 1);
        const fadeOut = Math.min((1 - p.progress) * 4, 1);
        const opacity = fadeIn * fadeOut * 0.55;

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} className="w-full mb-6">
      <canvas ref={canvasRef} />
    </div>
  );
}
