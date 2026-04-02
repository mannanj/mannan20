'use client';

import { create } from 'zustand';
import type {
  Node,
  Edge,
  Viewport,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type {
  JordanSession,
  CanvasState,
  DrawingTool,
  EventEntry,
} from './types';

interface PendingEvent {
  type: string;
  user: string;
  detail: string;
  timestamp: number;
}

interface JordanStore {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  session: JordanSession | null;
  markdownContent: string;
  lastSavedHash: string;
  isLoading: boolean;
  drawingTool: DrawingTool;
  pendingEvents: PendingEvent[];
  events: EventEntry[];

  setSession: (session: JordanSession) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setViewport: (viewport: Viewport) => void;
  setMarkdownContent: (content: string) => void;
  setLastSavedHash: (hash: string) => void;
  setIsLoading: (loading: boolean) => void;
  setDrawingTool: (tool: DrawingTool) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  addEdge: (edge: Edge) => void;
  queueEvent: (type: string, detail: string) => void;
  setEvents: (events: EventEntry[]) => void;
  loadState: (state: CanvasState) => void;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const useJordanStore = create<JordanStore>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  session: null,
  markdownContent: '',
  lastSavedHash: '',
  isLoading: true,
  drawingTool: null,
  pendingEvents: [],
  events: [],

  setSession: (session) => set({ session }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  setViewport: (viewport) => set({ viewport }),
  setMarkdownContent: (content) => set({ markdownContent: content }),
  setLastSavedHash: (hash) => set({ lastSavedHash: hash }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setDrawingTool: (tool) => set({ drawingTool: tool }),

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  removeNode: (id) =>
    set({ nodes: get().nodes.filter((n) => n.id !== id) }),

  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }),

  addEdge: (edge) => set({ edges: [...get().edges, edge] }),

  queueEvent: (type, detail) => {
    const session = get().session;
    if (!session) return;
    const user = `${session.name} ${session.device}`;
    set({
      pendingEvents: [
        ...get().pendingEvents,
        { type, user, detail, timestamp: Date.now() },
      ],
    });
  },

  setEvents: (events) => set({ events }),

  loadState: (state) =>
    set({
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport ?? DEFAULT_VIEWPORT,
    }),
}));
