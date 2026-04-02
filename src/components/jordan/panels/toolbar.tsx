'use client';

import { useCallback, useRef, useState } from 'react';
import { useJordanStore } from '@/lib/jordan/store';
import type { DrawingTool } from '@/lib/jordan/types';

const ACCEPTED_TYPES =
  '.pdf,.md,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.m4a,.ogg,.aac';

function getNodeType(
  type: string,
  name: string
): 'image' | 'pdf' | 'audio' | 'fileMarkdown' {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'text/markdown' || name.endsWith('.md')) return 'fileMarkdown';
  return 'image';
}

const TOOLS: { value: DrawingTool; label: string }[] = [
  { value: null, label: 'Select' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line' },
  { value: 'dashed', label: 'Dashed' },
];

export default function Toolbar() {
  const drawingTool = useJordanStore((s) => s.drawingTool);
  const setDrawingTool = useJordanStore((s) => s.setDrawingTool);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTextNode = useCallback(() => {
    const { addNode, session, viewport } = useJordanStore.getState();
    const createdBy = session
      ? `${session.name} ${session.device}`
      : 'Unknown';
    const x = (-viewport.x + 400) / viewport.zoom;
    const y = (-viewport.y + 300) / viewport.zoom;
    addNode({
      id: `text-${Date.now()}`,
      type: 'text',
      position: { x, y },
      data: { content: '', createdBy },
    });
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const { addNode, queueEvent, session } = useJordanStore.getState();

    let uploadCount = 0;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);

      try {
        const res = await fetch('/api/jordan/upload', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) continue;

        const data = await res.json();
        const nodeType = getNodeType(file.type, file.name);

        const nodeData: Record<string, unknown> = {
          url: data.url,
          filename: file.name,
        };

        if (nodeType === 'image') {
          nodeData.width = 400;
          nodeData.height = 300;
        }

        if (nodeType === 'fileMarkdown') {
          const text = await fetch(data.url).then((r) => r.text());
          nodeData.content = text;
        }

        addNode({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: nodeType,
          position: { x: 200 + uploadCount * 30, y: 200 + uploadCount * 30 },
          data: nodeData,
          style:
            nodeType === 'image'
              ? { width: 400, height: 300 }
              : nodeType === 'pdf'
                ? { width: 500, height: 600 }
                : undefined,
        });
        uploadCount++;
      } catch {
        continue;
      }
    }

    if (uploadCount > 0) {
      const user = session
        ? `${session.name} ${session.device}`
        : 'Unknown';
      queueEvent(
        'upload',
        uploadCount === 1
          ? `${user} uploaded a file`
          : `${user} uploaded ${uploadCount} files`
      );
    }

    setUploading(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(e.target.files);
        e.target.value = '';
      }
    },
    [uploadFiles]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="fixed left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-0.5 border border-white/10 bg-black/90 p-1" data-testid="jordan-toolbar">
        {TOOLS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => setDrawingTool(value)}
            data-testid={`jordan-tool-${value ?? 'select'}`}
            className={`px-3 py-1.5 text-left text-xs transition-colors ${
              drawingTool === value
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="my-0.5 border-t border-white/10" />
        <button
          onClick={addTextNode}
          data-testid="jordan-add-text"
          className="px-3 py-1.5 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
        >
          Text
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="jordan-upload"
          className="px-3 py-1.5 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60 disabled:opacity-30"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </>
  );
}
