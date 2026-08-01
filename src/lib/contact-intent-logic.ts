import type { ContactStreamFrame } from './types';

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MODEL_TEXT_LENGTH = 480;
export const MAX_HISTORY_ENTRIES = 6;
export const MAX_FRAME_BYTES = 4096;
export const MAX_STREAM_BUFFER_BYTES = 8192;

export interface ContactIntentHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

const encoder = new TextEncoder();

function characterLength(value: string): number {
  return [...value].length;
}

function truncateCharacters(value: string, limit: number): string {
  return [...value].slice(0, limit).join('');
}

export function sanitizeHistory(raw: unknown): ContactIntentHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const result: ContactIntentHistoryEntry[] = [];
  let expectedRole: ContactIntentHistoryEntry['role'] | undefined;
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    if (expectedRole !== undefined && role !== expectedRole) continue;
    const limit = role === 'user' ? MAX_MESSAGE_LENGTH : MAX_MODEL_TEXT_LENGTH;
    result.push({ role, content: truncateCharacters(content, limit) });
    expectedRole = role === 'user' ? 'assistant' : 'user';
  }
  return result.slice(-MAX_HISTORY_ENTRIES);
}

export function historyUsedQuestion(history: ContactIntentHistoryEntry[]): boolean {
  return history.some(entry => entry.role === 'assistant' && entry.content.includes('?'));
}

export function validateModelSentence(
  sentence: string,
  questionUsed: boolean,
  responseQuestionCount: number,
): { valid: boolean; questionCount: number } {
  const sentenceQuestionCount = [...sentence].filter(char => char === '?').length;
  const questionCount = responseQuestionCount + sentenceQuestionCount;
  return {
    valid: characterLength(sentence) <= MAX_MODEL_TEXT_LENGTH && !(questionUsed && sentenceQuestionCount > 0) && questionCount <= 1,
    questionCount,
  };
}

export function takeCompleteSentences(
  buffer: string,
  remaining: number,
): { complete: string; rest: string } {
  if (remaining <= 0) return { complete: '', rest: buffer };
  let end = 0;
  const boundary = /[.!?](?=\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(buffer)) !== null) {
    if (characterLength(buffer.slice(0, match.index + 1)) > remaining) break;
    end = match.index + 1;
  }
  return { complete: buffer.slice(0, end), rest: buffer.slice(end) };
}

export function finalizeUpstreamSuffix(
  suffix: string,
  remaining: number,
  questionUsed: boolean,
  responseQuestionCount: number,
): { text: string; questionCount: number } | null {
  const trimmed = suffix.trim();
  if (!trimmed) return null;
  const text = `${trimmed}.`;
  if (characterLength(text) > remaining) return null;
  const validation = validateModelSentence(text, questionUsed, responseQuestionCount);
  return validation.valid ? { text, questionCount: validation.questionCount } : null;
}

function frameBytes(frame: string): number {
  return encoder.encode(frame).byteLength;
}

export function encodeFrame(frame: ContactStreamFrame): string {
  if (frame.type === 'text' && characterLength(frame.value) > MAX_MODEL_TEXT_LENGTH) return '';
  const json = JSON.stringify(frame)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const line = `${json}\n`;
  return frameBytes(line) <= MAX_FRAME_BYTES ? line : '';
}

export function parseFrame(line: string): ContactStreamFrame | null {
  if (!line.endsWith('\n') || frameBytes(line) > MAX_FRAME_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(line.slice(0, -1));
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.type === 'meta' && record.version === 1 && Object.keys(record).length === 2) return { type: 'meta', version: 1 };
  if (record.type === 'text' && typeof record.value === 'string' && Object.keys(record).length === 2 && characterLength(record.value) <= MAX_MODEL_TEXT_LENGTH) {
    return { type: 'text', value: record.value };
  }
  if (record.type === 'done' && Object.keys(record).length === 1) return { type: 'done' };
  if (record.type === 'error' && record.code === 'upstream' && Object.keys(record).length === 2) return { type: 'error', code: 'upstream' };
  return null;
}

export function parseFrames(input: string): ContactStreamFrame[] | null {
  const lines = input.split('\n');
  const incomplete = lines.pop() ?? '';
  if (encoder.encode(incomplete).byteLength > MAX_STREAM_BUFFER_BYTES) return null;
  const frames = lines.map(line => parseFrame(`${line}\n`));
  if (frames.some(frame => frame === null)) return null;
  const parsed = frames as ContactStreamFrame[];
  if (parsed.length === 0 || parsed[0].type !== 'meta') return null;
  let terminal = false;
  let metaCount = 0;
  let textCount = 0;
  for (const frame of parsed) {
    if (frame.type === 'meta') metaCount++;
    if (frame.type === 'text') textCount += characterLength(frame.value);
    if (textCount > MAX_MODEL_TEXT_LENGTH) return null;
    if (terminal) return null;
    if (frame.type === 'done' || frame.type === 'error') terminal = true;
  }
  return metaCount === 1 ? parsed : null;
}
