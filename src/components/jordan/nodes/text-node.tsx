'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useJordanStore } from '@/lib/jordan/store';
import NodeHandles from './node-handles';

function TextNode({ id, data }: NodeProps) {
  const { content, createdBy } = data as {
    content: string;
    createdBy: string;
  };
  const [editing, setEditing] = useState(!content);
  const [text, setText] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    useJordanStore.getState().updateNodeData(id, { content: text });
  }, [id, text]);

  return (
    <div
      className="relative min-w-[120px] max-w-[300px] border border-white/10 bg-black/90 p-2"
      data-testid="jordan-text-node"
      onDoubleClick={() => setEditing(true)}
    >
      <NodeHandles />
      {editing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') handleBlur();
          }}
          data-testid="jordan-text-node-editor"
          className="w-full resize-none bg-transparent text-xs leading-relaxed text-white/80 outline-none"
          rows={3}
        />
      ) : (
        <p
          className="whitespace-pre-wrap text-xs leading-relaxed text-white/80"
          data-testid="jordan-text-node-content"
        >
          {text || 'Double-click to edit'}
        </p>
      )}
      <span className="mt-1 block text-[10px] text-white/20">
        {createdBy}
      </span>
    </div>
  );
}

export default memo(TextNode);
