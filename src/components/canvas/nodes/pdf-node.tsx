'use client';

import { memo } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import NodeHandles from './node-handles';
import { PdfViewer } from '@/components/pdf-viewer';

function PdfNode({ id, data, selected }: NodeProps) {
  const { url, filename } = data as { url: string; filename: string };

  return (
    <>
      <NodeHandles />
      <NodeResizer
        isVisible={!!selected}
        minWidth={300}
        minHeight={400}
        lineClassName="!border-white/20"
        handleClassName="!w-2 !h-2 !bg-white/40 !border-white/60"
      />
      <div className="flex h-full w-full min-h-[400px] min-w-[300px] flex-col border border-white/10 bg-black">
        <div className="flex items-center border-b border-white/10 px-3 py-1.5">
          <span className="truncate text-xs text-white/40">{filename}</span>
        </div>
        <PdfViewer src={url} title={filename} documentId={`canvas-pdf-${id}`} className="flex-1" />
      </div>
    </>
  );
}

export default memo(PdfNode);
