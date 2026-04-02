'use client';

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import NodeHandles from './node-handles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useJordanStore } from '@/lib/jordan/store';
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
  const content = useJordanStore((s) => s.markdownContent);
  const setContent = useJordanStore((s) => s.setMarkdownContent);
  const lastSavedHash = useJordanStore((s) => s.lastSavedHash);
  const setLastSavedHash = useJordanStore((s) => s.setLastSavedHash);
  const session = useJordanStore((s) => s.session);
  const queueEvent = useJordanStore((s) => s.queueEvent);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/jordan/document')
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setLastSavedHash(simpleHash(data.content));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [setContent, setLastSavedHash]);

  const saveDocument = useCallback(
    (text: string) => {
      const hash = simpleHash(text);
      if (hash === lastSavedHash) return;
      setLastSavedHash(hash);
      const editedBy = session
        ? `${session.name} ${session.device}`
        : 'Unknown';
      fetch('/api/jordan/document', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, editedBy }),
      }).catch(() => {});
      queueEvent('edit', `${editedBy} edited the document`);
    },
    [lastSavedHash, setLastSavedHash, session, queueEvent]
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
    <div className="relative flex w-[700px] flex-col border border-white/10 bg-black" data-testid="jordan-doc-node">
      <NodeHandles />
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-white/50">
          SacredTreeKeepers.md
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-white/30 transition-colors hover:text-white/60"
            onMouseDown={(e) => e.stopPropagation()}
            data-testid="jordan-doc-history-btn"
          >
            History
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-white/30 transition-colors hover:text-white/60"
            onMouseDown={(e) => e.stopPropagation()}
            data-testid="jordan-doc-edit-btn"
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
          data-testid="jordan-doc-preview"
          onDoubleClick={() => setEditing(true)}
        >
          <div className="prose-jordan text-sm leading-relaxed">
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
