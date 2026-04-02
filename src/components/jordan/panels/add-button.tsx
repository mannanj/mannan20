'use client';

import { useState, useRef, useCallback } from 'react';
import { useJordanStore } from '@/lib/jordan/store';

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

export default function AddButton() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setOpen(false);
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
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(e.target.files);
        e.target.value = '';
      }
    },
    [uploadFiles]
  );

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
    setOpen(false);
  }, []);

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

      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {open && (
          <div
            className="flex flex-col gap-1 border border-white/10 bg-black/90 p-1"
            data-testid="jordan-fab-menu"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="jordan-fab-upload"
              className="px-4 py-2 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Upload Files
            </button>
            <button
              onClick={addTextNode}
              data-testid="jordan-fab-text"
              className="px-4 py-2 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Text Note
            </button>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          disabled={uploading}
          data-testid="jordan-fab"
          className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black text-lg text-white/60 transition-all hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          {uploading ? (
            <span className="text-xs">...</span>
          ) : (
            <span
              className="transition-transform"
              style={{ transform: open ? 'rotate(45deg)' : 'none' }}
            >
              +
            </span>
          )}
        </button>
      </div>
    </>
  );
}
