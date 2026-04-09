'use client';

import { useCallback, useRef, useState } from 'react';
import { useCanvasStore, useCanvasStoreApi, useCanvasConfig } from '../canvas-context';
import { uploadFiles, ACCEPTED_FILE_TYPES } from '../lib/upload-utils';
import type { DrawingTool } from '../lib/types';

const TOOLS: { value: DrawingTool; label: string }[] = [
  { value: null, label: 'Select' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line' },
  { value: 'dashed', label: 'Dashed' },
];

export default function Toolbar() {
  const drawingTool = useCanvasStore((s) => s.drawingTool);
  const setDrawingTool = useCanvasStore((s) => s.setDrawingTool);
  const store = useCanvasStoreApi();
  const config = useCanvasConfig();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [store]);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
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
      <div className="fixed left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-0.5 border border-white/10 bg-black/90 p-1" data-testid={`${config.testIdPrefix}-toolbar`}>
        {TOOLS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => setDrawingTool(value)}
            data-testid={`${config.testIdPrefix}-tool-${value ?? 'select'}`}
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
          data-testid={`${config.testIdPrefix}-add-text`}
          className="px-3 py-1.5 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
        >
          Text
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid={`${config.testIdPrefix}-upload`}
          className="px-3 py-1.5 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60 disabled:opacity-30"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </>
  );
}
