'use client';

import { useEffect, useState } from 'react';
import { palmY, pinchRatio, type HandPoint } from './hand-gesture';
import { TRACE_SCRIPT, createTrace, pushFrame, replayTrace, type HandTrace, type SegmentResult } from './hand-trace';

const PANEL_POLL_MS = 200;
const FPS_EASE = 0.1;

type TracedPoint = HandPoint & { z?: number };

export class TraceRecorder {
  trace: HandTrace = createTrace('');
  segIndex = -1;
  segStart = 0;
  fps = 0;
  ratio = Number.NaN;
  palmSpeed = 0;
  pinches = 0;
  flicks = 0;
  private lastT = 0;
  private lastPalm: { y: number; t: number } | null = null;

  start(now: number): void {
    this.trace = createTrace(navigator.userAgent);
    this.segIndex = 0;
    this.segStart = now;
    this.pinches = 0;
    this.flicks = 0;
    (window as unknown as { __handTrace?: HandTrace }).__handTrace = this.trace;
  }

  done(): boolean {
    return this.segIndex >= TRACE_SCRIPT.length;
  }

  segmentAt(now: number): string | null {
    if (this.segIndex < 0 || this.done()) return null;
    if (now - this.segStart > TRACE_SCRIPT[this.segIndex].ms) {
      this.segIndex += 1;
      this.segStart = now;
    }
    return this.done() ? null : TRACE_SCRIPT[this.segIndex].id;
  }

  frame(now: number, hand: TracedPoint[] | null, pinchDown: boolean, flick: boolean): void {
    if (this.lastT > 0) this.fps += (1000 / Math.max(1, now - this.lastT) - this.fps) * FPS_EASE;
    this.lastT = now;
    if (hand) {
      this.ratio = pinchRatio(hand);
      const y = palmY(hand);
      if (this.lastPalm) this.palmSpeed = Math.abs(y - this.lastPalm.y) / Math.max(0.001, (now - this.lastPalm.t) / 1000);
      this.lastPalm = { y, t: now };
    } else {
      this.lastPalm = null;
    }
    if (pinchDown) this.pinches += 1;
    if (flick) this.flicks += 1;
    if (this.segIndex < 0) return;
    const seg = this.segmentAt(now);
    pushFrame(this.trace, { t: now, seg, lm: hand ? hand.map((p) => [p.x, p.y, p.z ?? 0]) : null });
    if (seg && pinchDown) this.trace.events.push({ t: now, seg, type: 'pinch' });
    if (seg && flick) this.trace.events.push({ t: now, seg, type: 'flick' });
  }
}

function download(trace: HandTrace): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(trace)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `hand-trace-${trace.recordedAt.replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HandTracePanel({ recorder }: { recorder: TraceRecorder }) {
  const [, setTick] = useState(0);
  const [results, setResults] = useState<Record<string, SegmentResult> | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      recorder.segmentAt(now);
      if (recorder.done() && !results && recorder.trace.frames.length > 0) setResults(replayTrace(recorder.trace));
      setTick((n) => n + 1);
    }, PANEL_POLL_MS);
    return () => window.clearInterval(id);
  }, [recorder, results]);

  const seg = recorder.segIndex >= 0 && !recorder.done() ? TRACE_SCRIPT[recorder.segIndex] : null;
  const left = seg ? Math.max(0, Math.ceil((seg.ms - (performance.now() - recorder.segStart)) / 1000)) : 0;

  return (
    <div data-hud data-testid="hand-trace" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="fixed left-6 top-20 z-[96] flex w-72 flex-col gap-2 rounded-xl border border-white/15 bg-black/80 p-3 font-mono text-xs text-white/85 backdrop-blur">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span>fps</span>
        <span data-testid="hand-trace-fps">{recorder.fps.toFixed(0)}</span>
        <span>pinch ratio</span>
        <span data-testid="hand-trace-ratio">{Number.isFinite(recorder.ratio) ? recorder.ratio.toFixed(2) : '—'}</span>
        <span>palm speed</span>
        <span>{recorder.palmSpeed.toFixed(2)}/s</span>
        <span>pinches / flicks</span>
        <span>
          {recorder.pinches} / {recorder.flicks}
        </span>
      </div>
      {seg && (
        <p data-testid="hand-trace-prompt" className="rounded-lg bg-[#ffd84d]/15 px-2 py-1.5 font-sans text-sm text-[#ffd84d]">
          {seg.prompt} · {left}s
        </p>
      )}
      {results && (
        <table data-testid="hand-trace-results" className="w-full">
          <tbody>
            {TRACE_SCRIPT.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>
                  {results[s.id].squeezes}/{s.expected}
                </td>
                <td>{results[s.id].frames ? Math.round((results[s.id].handFrames / results[s.id].frames) * 100) : 0}% seen</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex gap-2 font-sans">
        <button type="button" data-testid="hand-trace-record" onClick={() => { setResults(null); recorder.start(performance.now()); }} className="flex-1 cursor-pointer rounded-lg bg-white/15 px-2 py-1.5 hover:bg-white/25">
          {recorder.segIndex < 0 ? 'Record gestures' : 'Record again'}
        </button>
        <button type="button" data-testid="hand-trace-download" disabled={!recorder.done()} onClick={() => download(recorder.trace)} className="flex-1 cursor-pointer rounded-lg bg-[#7cf0a8] px-2 py-1.5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
          Download trace
        </button>
      </div>
    </div>
  );
}
