import type { Node, Edge, Viewport } from '@xyflow/react';

export interface JordanSession {
  name: string;
  device: string;
  createdAt: string;
}

export interface MarkdownDocumentData {
  label: string;
}

export interface ImageNodeData {
  url: string;
  filename: string;
  width: number;
  height: number;
}

export interface PdfNodeData {
  url: string;
  filename: string;
}

export interface AudioNodeData {
  url: string;
  filename: string;
  duration?: number;
}

export interface FileMarkdownData {
  url: string;
  filename: string;
  content: string;
}

export interface TextNodeData {
  content: string;
  createdBy: string;
}

export type JordanNodeType =
  | 'markdownDocument'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'fileMarkdown'
  | 'text';

export type LineStyle = 'solid' | 'dashed' | 'arrow';

export interface CustomEdgeData {
  lineStyle: LineStyle;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

export interface MarkdownVersion {
  content: string;
  editedBy: string;
  editedAt: string;
}

export interface EventEntry {
  message: string;
  user: string;
  timestamp: string;
}

export type DrawingTool = 'arrow' | 'line' | 'dashed' | null;
