'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type OnConnect,
} from '@xyflow/react';
import { useJordanStore } from '@/lib/jordan/store';
import { useAutoSave } from '@/lib/jordan/use-auto-save';
import MarkdownDocumentNode from './nodes/markdown-document-node';
import ImageNode from './nodes/image-node';
import PdfNode from './nodes/pdf-node';
import AudioNode from './nodes/audio-node';
import FileMarkdownNode from './nodes/file-markdown-node';
import TextNode from './nodes/text-node';
import CustomEdge from './edges/custom-edge';
import Toolbar from './panels/toolbar';
import EventHistoryPanel from './panels/event-history-panel';

const INITIAL_MARKDOWN_NODE = {
  id: 'doc-main',
  type: 'markdownDocument',
  position: { x: 100, y: 50 },
  data: { label: 'SacredTreeKeepers.md' },
  draggable: true,
};

function getNodeTypeForFile(
  type: string,
  name: string
): 'image' | 'pdf' | 'audio' | 'fileMarkdown' {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'text/markdown' || name.endsWith('.md')) return 'fileMarkdown';
  return 'image';
}

export default function Canvas() {
  const nodeTypes = useMemo(
    () => ({
      markdownDocument: MarkdownDocumentNode,
      image: ImageNode,
      pdf: PdfNode,
      audio: AudioNode,
      fileMarkdown: FileMarkdownNode,
      text: TextNode,
    }),
    []
  );

  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    setViewport,
    isLoading,
    setIsLoading,
    loadState,
    drawingTool,
  } = useJordanStore();

  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { markInitialized } = useAutoSave();

  useEffect(() => {
    const flushEvents = () => {
      const store = useJordanStore.getState();
      const pending = store.pendingEvents;
      if (!pending.length) return;

      const batched = new Map<string, { count: number; detail: string }>();
      for (const ev of pending) {
        const key = `${ev.user}::${ev.type}`;
        const existing = batched.get(key);
        if (existing) {
          existing.count++;
        } else {
          batched.set(key, { count: 1, detail: ev.detail });
        }
      }

      for (const [key, { count, detail }] of batched) {
        const user = key.split('::')[0];
        const message = count > 1 ? `${detail} (${count}x)` : detail;
        fetch('/api/jordan/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, user }),
        }).catch(() => {});
      }

      useJordanStore.setState({ pendingEvents: [] });
    };

    const eventInterval = setInterval(flushEvents, 30000);
    return () => clearInterval(eventInterval);
  }, []);

  useEffect(() => {
    fetch('/api/jordan/state')
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes?.length || data.edges?.length) {
          loadState(data);
        } else {
          const { addNode } = useJordanStore.getState();
          addNode(INITIAL_MARKDOWN_NODE);
        }
      })
      .catch(() => {
        const { addNode } = useJordanStore.getState();
        addNode(INITIAL_MARKDOWN_NODE);
      })
      .finally(() => {
        setIsLoading(false);
        markInitialized();
      });
  }, [loadState, setIsLoading, markInitialized]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useJordanStore.getState().setDrawingTool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConnect: OnConnect = useCallback((params) => {
    const { addEdge, drawingTool, setDrawingTool } = useJordanStore.getState();
    const lineStyle =
      drawingTool === 'arrow'
        ? 'arrow'
        : drawingTool === 'dashed'
          ? 'dashed'
          : 'solid';
    addEdge({
      ...params,
      id: `e-${Date.now()}`,
      type: 'custom',
      data: { lineStyle },
    });
    setDrawingTool(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files.length) return;

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
        const nodeType = getNodeTypeForFile(file.type, file.name);

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

        const rect = reactFlowRef.current?.getBoundingClientRect();
        const { viewport: v } = useJordanStore.getState();
        const x = rect
          ? (e.clientX - rect.left - v.x) / v.zoom + uploadCount * 30
          : 200 + uploadCount * 30;
        const y = rect
          ? (e.clientY - rect.top - v.y) / v.zoom + uploadCount * 30
          : 200 + uploadCount * 30;

        addNode({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: nodeType,
          position: { x, y },
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-xs text-white/30">Loading...</p>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowRef}
      className={`h-full w-full ${drawingTool ? 'cursor-crosshair' : ''}`}
      data-testid="jordan-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'custom', data: { lineStyle: 'solid' } }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onViewportChange={setViewport}
        defaultViewport={viewport}
        fitView={false}
        minZoom={0.1}
        maxZoom={10}
        panOnDrag={!drawingTool}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-white/10 !shadow-none [&>button]:!bg-white/5 [&>button]:!border-white/10 [&>button]:!text-white/50 [&>button:hover]:!bg-white/10"
        />
      </ReactFlow>
      <Toolbar />
      <EventHistoryPanel />
    </div>
  );
}
