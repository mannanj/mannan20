'use client';

import { memo, useState, useEffect } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import NodeHandles from './node-handles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function FileMarkdownNode({ data, selected }: NodeProps) {
  const { url, filename } = data as {
    url: string;
    filename: string;
    content?: string;
  };
  const [content, setContent] = useState((data as { content?: string }).content ?? '');
  const [loading, setLoading] = useState(!content);

  useEffect(() => {
    if (content) return;
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent('Failed to load file'))
      .finally(() => setLoading(false));
  }, [url, content]);

  return (
    <>
      <NodeHandles />
      <NodeResizer
        isVisible={!!selected}
        minWidth={250}
        minHeight={150}
        lineClassName="!border-white/20"
        handleClassName="!w-2 !h-2 !bg-white/40 !border-white/60"
      />
      <div className="flex h-full w-full min-w-[250px] flex-col border border-white/10 bg-black">
        <div className="flex items-center border-b border-white/10 px-3 py-1.5">
          <span className="truncate text-xs text-white/40">{filename}</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <span className="text-xs text-white/30">Loading...</span>
          ) : (
            <div className="prose-jordan text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(FileMarkdownNode);
