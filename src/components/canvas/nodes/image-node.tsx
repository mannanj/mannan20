'use client';

import { memo } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import NodeHandles from './node-handles';

function ImageNode({ data, selected }: NodeProps) {
  const { url, filename } = data as { url: string; filename: string };

  return (
    <>
      <NodeHandles />
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={80}
        lineClassName="!border-white/20"
        handleClassName="!w-2 !h-2 !bg-white/40 !border-white/60"
      />
      <div className="h-full w-full overflow-hidden">
        <img
          src={url}
          alt={filename}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    </>
  );
}

export default memo(ImageNode);
