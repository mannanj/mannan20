// Minimal Antithesis fallback SDK: assertions as JSON lines.
// https://antithesis.com/docs/reference/sdk/fallback/assert/
// Every assertion is declared up front (the catalog) so one that is never hit still fails.
import { appendFileSync } from 'node:fs';

type AssertType = 'always' | 'sometimes' | 'reachability';
interface Decl { type: AssertType; display: string; mustHit: boolean }

const out =
  process.env.ANTITHESIS_SDK_LOCAL_OUTPUT ??
  (process.env.ANTITHESIS_OUTPUT_DIR ? `${process.env.ANTITHESIS_OUTPUT_DIR}/sdk.jsonl` : null);

function emit(obj: unknown): void {
  const line = JSON.stringify(obj) + '\n';
  if (out) appendFileSync(out, line);
  else process.stdout.write(line);
}

const registry = new Map<string, Decl>();
const seen = new Map<string, { t: boolean; f: boolean }>();

function body(message: string, d: Decl, hit: boolean, condition: boolean, details?: Record<string, unknown>) {
  return {
    antithesis_assert: {
      id: message,
      message,
      condition,
      display_type: d.display,
      hit,
      must_hit: d.mustHit,
      assert_type: d.type,
      location: { file: 'antithesis/game-logic/gamelogic/server.ts', function: '', class: '', begin_line: 0, begin_column: 0 },
      ...(details ? { details } : {}),
    },
  };
}

export function declare(message: string, type: AssertType): void {
  const d: Decl =
    type === 'always'
      ? { type, display: 'Always', mustHit: true }
      : type === 'sometimes'
        ? { type, display: 'Sometimes', mustHit: true }
        : { type, display: 'Reachable', mustHit: true };
  registry.set(message, d);
  emit(body(message, d, false, false));
}

function evaluate(message: string, condition: boolean, details?: Record<string, unknown>): void {
  const d = registry.get(message);
  if (!d) throw new Error(`undeclared assertion: ${message}`);
  const s = seen.get(message) ?? { t: false, f: false };
  if (condition ? s.t : s.f) return; // only the first true and first false evaluation are recorded
  if (condition) s.t = true;
  else s.f = true;
  seen.set(message, s);
  emit(body(message, d, true, condition, details));
}

export const always = (m: string, c: boolean, details?: Record<string, unknown>) => evaluate(m, c, details);
export const sometimes = (m: string, c: boolean, details?: Record<string, unknown>) => evaluate(m, c, details);
export const reachable = (m: string, details?: Record<string, unknown>) => evaluate(m, true, details);
