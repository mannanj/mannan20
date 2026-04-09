'use client';

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import NodeHandles from './node-handles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCanvasStore, useCanvasConfig } from '../canvas-context';
import MarkdownEditor from './markdown-editor';
import VersionHistoryPanel from './version-history-panel';

const SAVE_DEBOUNCE_MS = 1500;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function MarkdownDocumentNode(_props: NodeProps) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const config = useCanvasConfig();
  const content = useCanvasStore((s) => s.markdownContent);
  const setContent = useCanvasStore((s) => s.setMarkdownContent);
  const lastSavedHash = useCanvasStore((s) => s.lastSavedHash);
  const setLastSavedHash = useCanvasStore((s) => s.setLastSavedHash);
  const session = useCanvasStore((s) => s.session);
  const queueEvent = useCanvasStore((s) => s.queueEvent);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${config.apiBasePath}/document`)
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setLastSavedHash(simpleHash(data.content));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [setContent, setLastSavedHash, config.apiBasePath]);

  const saveDocument = useCallback(
    (text: string) => {
      const hash = simpleHash(text);
      if (hash === lastSavedHash) return;
      setLastSavedHash(hash);
      const editedBy = session
        ? `${session.name} ${session.device}`
        : 'Unknown';
      fetch(`${config.apiBasePath}/document`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, editedBy }),
      }).catch(() => {});
      queueEvent('edit', `${editedBy} edited the document`);
    },
    [lastSavedHash, setLastSavedHash, session, queueEvent, config.apiBasePath]
  );

  const handleChange = useCallback(
    (text: string) => {
      setContent(text);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveDocument(text), SAVE_DEBOUNCE_MS);
    },
    [setContent, saveDocument]
  );

  const handleSaveAndClose = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveDocument(content);
    setEditing(false);
  }, [content, saveDocument]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-40 w-[700px] items-center justify-center border border-white/10 bg-black">
        <span className="text-xs text-white/30">Loading document...</span>
      </div>
    );
  }

  return (
    <div className="relative flex w-[700px] flex-col border border-white/10 bg-black" data-testid={`${config.testIdPrefix}-doc-node`}>
      <NodeHandles />
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-white/50">
          {config.documentLabel}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-white/30 transition-colors hover:text-white/60"
            onMouseDown={(e) => e.stopPropagation()}
            data-testid={`${config.testIdPrefix}-doc-history-btn`}
          >
            History
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-white/30 transition-colors hover:text-white/60"
            onMouseDown={(e) => e.stopPropagation()}
            data-testid={`${config.testIdPrefix}-doc-edit-btn`}
          >
            {editing ? 'Preview' : 'Edit'}
          </button>
        </div>
      </div>

      {showHistory ? (
        <VersionHistoryPanel onClose={() => setShowHistory(false)} />
      ) : editing ? (
        <MarkdownEditor
          content={content}
          onChange={handleChange}
          onSaveAndClose={handleSaveAndClose}
        />
      ) : (
        <div
          className="overflow-auto p-4"
          data-testid={`${config.testIdPrefix}-doc-preview`}
          onDoubleClick={() => setEditing(true)}
        >
          <div className="prose-canvas text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MarkdownDocumentNode);
