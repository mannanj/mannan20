"use client";

import { useEffect, useRef } from "react";

function drawStatic(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const rowSpacing = 18;
  const colSpacing = 22;
  const rows = Math.max(3, Math.floor(h / rowSpacing));
  const cols = Math.max(4, Math.floor(w / colSpacing));
  const nodes: { x: number; y: number; r: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const count = r % 2 === 0 ? cols : cols + 1;
    for (let c = 0; c < count; c++) {
      const jx = (rand() - 0.5) * 8;
      const jy = (rand() - 0.5) * 6;
      const radius = rand() < 0.82
        ? 0.3 + rand() * 0.25
        : rand() < 0.96
          ? 0.55 + rand() * 0.25
          : 0.85 + rand() * 0.3;
      nodes.push({
        x: (c + 0.5) * (w / count) + jx,
        y: (r + 0.5) * (h / rows) + jy,
        r: radius,
      });
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 0.3;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 34 && rand() < 0.25) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  const dustCount = Math.round((w * h) / 180);
  for (let i = 0; i < dustCount; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + rand() * 0.12})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 0.18 + rand() * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const n of nodes) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + (n.r - 0.3) * 0.6})`;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function CommunityNodesPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    drawStatic(c);
    const onResize = () => drawStatic(c);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-md bg-[#0b0b0b]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
