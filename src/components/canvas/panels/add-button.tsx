'use client';

import { useState, useRef, useCallback } from 'react';
import { useCanvasStoreApi, useCanvasConfig } from '../canvas-context';
import { uploadFiles, ACCEPTED_FILE_TYPES } from '../lib/upload-utils';

export default function AddButton() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const store = useCanvasStoreApi();
  const config = useCanvasConfig();

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setOpen(false);
      const { addNode, queueEvent, session } = store.getState();
      const sessionUser = session
        ? `${session.name} ${session.device}`
        : 'Unknown';
      await uploadFiles(
        files,
        { apiBasePath: config.apiBasePath, addNode, queueEvent, sessionUser },
        (i) => ({ x: 200 + i * 30, y: 200 + i * 30 })
      );
      setUploading(false);
    },
    [store, config.apiBasePath]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleUpload(e.target.files);
        e.target.value = '';
      }
    },
    [handleUpload]
  );

  const addTextNode = useCallback(() => {
    const { addNode, session, viewport } = store.getState();
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
  }, [store]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {open && (
          <div
            className="flex flex-col gap-1 border border-white/10 bg-black/90 p-1"
            data-testid={`${config.testIdPrefix}-fab-menu`}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid={`${config.testIdPrefix}-fab-upload`}
              className="px-4 py-2 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Upload Files
            </button>
            <button
              onClick={addTextNode}
              data-testid={`${config.testIdPrefix}-fab-text`}
              className="px-4 py-2 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              Text Note
            </button>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          disabled={uploading}
          data-testid={`${config.testIdPrefix}-fab`}
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
