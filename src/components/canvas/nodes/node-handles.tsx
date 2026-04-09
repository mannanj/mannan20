'use client';

import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '../canvas-context';

const POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];

export default function NodeHandles() {
  const drawingTool = useCanvasStore((s) => s.drawingTool);
  const active = drawingTool !== null;

  return (
    <>
      {POSITIONS.map((pos) => (
        <Handle
          key={`source-${pos}`}
          type="source"
          position={pos}
          id={`source-${pos}`}
          className={`!h-2 !w-2 !border !border-white/40 !bg-white/20 transition-opacity ${active ? '!opacity-100' : '!opacity-0'}`}
        />
      ))}
      {POSITIONS.map((pos) => (
        <Handle
          key={`target-${pos}`}
          type="target"
          position={pos}
          id={`target-${pos}`}
          className={`!h-2 !w-2 !border !border-white/40 !bg-white/20 transition-opacity ${active ? '!opacity-100' : '!opacity-0'}`}
        />
      ))}
    </>
  );
}
