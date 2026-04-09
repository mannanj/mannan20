'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type OnConnect,
} from '@xyflow/react';
import { useCanvasStore, useCanvasStoreApi, useCanvasConfig } from './canvas-context';
import { useAutoSave } from './lib/use-auto-save';
import { uploadFiles } from './lib/upload-utils';
import MarkdownDocumentNode from './nodes/markdown-document-node';
import ImageNode from './nodes/image-node';
import PdfNode from './nodes/pdf-node';
import AudioNode from './nodes/audio-node';
import FileMarkdownNode from './nodes/file-markdown-node';
import TextNode from './nodes/text-node';
import CustomEdge from './edges/custom-edge';
import Toolbar from './panels/toolbar';
import EventHistoryPanel from './panels/event-history-panel';

export default function CanvasShell() {
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

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const isLoading = useCanvasStore((s) => s.isLoading);
  const drawingTool = useCanvasStore((s) => s.drawingTool);

  const store = useCanvasStoreApi();
  const config = useCanvasConfig();
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const { markInitialized } = useAutoSave();

  useEffect(() => {
    const flushEvents = () => {
      const state = store.getState();
      const pending = state.pendingEvents;
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
        fetch(`${config.apiBasePath}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, user }),
        }).catch(() => {});
      }

      store.setState({ pendingEvents: [] });
    };

    const eventInterval = setInterval(flushEvents, 30000);
    return () => clearInterval(eventInterval);
  }, [store, config.apiBasePath]);

  useEffect(() => {
    const { loadState, setIsLoading, addNode } = store.getState();
    fetch(`${config.apiBasePath}/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes?.length || data.edges?.length) {
          loadState(data);
        } else {
          addNode({
            id: config.initialNode.id,
            type: 'markdownDocument',
            position: config.initialNode.position,
            data: config.initialNode.data,
            draggable: true,
          });
        }
      })
      .catch(() => {
        addNode({
          id: config.initialNode.id,
          type: 'markdownDocument',
          position: config.initialNode.position,
          data: config.initialNode.data,
          draggable: true,
        });
      })
      .finally(() => {
        setIsLoading(false);
        markInitialized();
      });
  }, [store, config, markInitialized]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        store.getState().setDrawingTool(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  const handleConnect: OnConnect = useCallback(
    (params) => {
      const { addEdge, drawingTool: tool, setDrawingTool } = store.getState();
      const lineStyle =
        tool === 'arrow'
          ? 'arrow'
          : tool === 'dashed'
            ? 'dashed'
            : 'solid';
      addEdge({
        ...params,
        id: `e-${Date.now()}`,
        type: 'custom',
        data: { lineStyle },
      });
      setDrawingTool(null);
    },
    [store]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (!files.length) return;

      const { addNode, queueEvent, session } = store.getState();
      const sessionUser = session
        ? `${session.name} ${session.device}`
        : 'Unknown';

      await uploadFiles(
        files,
        { apiBasePath: config.apiBasePath, addNode, queueEvent, sessionUser },
        (i) => {
          const rect = reactFlowRef.current?.getBoundingClientRect();
          const { viewport: v } = store.getState();
          const x = rect
            ? (e.clientX - rect.left - v.x) / v.zoom + i * 30
            : 200 + i * 30;
          const y = rect
            ? (e.clientY - rect.top - v.y) / v.zoom + i * 30
            : 200 + i * 30;
          return { x, y };
        }
      );
    },
    [store, config.apiBasePath]
  );

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
      data-testid={`${config.testIdPrefix}-canvas`}
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
