'use client';

import { memo } from 'react';
import {
  BaseEdge,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type { CustomEdgeData } from '@/lib/jordan/types';

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const lineStyle = edgeData?.lineStyle ?? 'solid';

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const strokeDasharray = lineStyle === 'dashed' ? '6,4' : undefined;
  const markerEnd =
    lineStyle === 'arrow' ? `url(#arrow-${id})` : undefined;

  return (
    <>
      {lineStyle === 'arrow' && (
        <defs>
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={selected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'}
            />
          </marker>
        </defs>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected
            ? 'rgba(255,255,255,0.8)'
            : 'rgba(255,255,255,0.3)',
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray,
        }}
        markerEnd={markerEnd}
      />
    </>
  );
}

export default memo(CustomEdge);
