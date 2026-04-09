'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCanvasConfig } from '../canvas-context';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="text-xs text-white/30">Loading editor...</span>
    </div>
  ),
});

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSaveAndClose: () => void;
}

export default function MarkdownEditor({
  content,
  onChange,
  onSaveAndClose,
}: MarkdownEditorProps) {
  const config = useCanvasConfig();

  const handleChange = useCallback(
    (val?: string) => {
      onChange(val ?? '');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSaveAndClose();
      }
    },
    [onSaveAndClose]
  );

  return (
    <div className="flex h-full min-h-[500px] flex-col" data-testid={`${config.testIdPrefix}-doc-editor`}>
      <div className="flex items-center justify-end border-b border-white/10 px-3 py-1.5">
        <button
          onClick={onSaveAndClose}
          onMouseDown={(e) => e.stopPropagation()}
          data-testid={`${config.testIdPrefix}-doc-done-btn`}
          className="border border-white/20 px-3 py-1 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          Done
        </button>
      </div>
      <div className="flex flex-1 gap-0">
        <div
          className="canvas-md-editor flex-1 border-r border-white/10"
          data-color-mode="dark"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <MDEditor
            value={content}
            onChange={handleChange}
            preview="edit"
            height="100%"
            visibleDragbar={false}
          />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="prose-canvas text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
