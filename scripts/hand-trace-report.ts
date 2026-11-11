import { readFileSync } from 'node:fs';
import { replayTrace, type HandTrace } from '../src/components/game/hand-trace';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: bun scripts/hand-trace-report.ts <trace.json> [...]');
  process.exit(1);
}
for (const file of files) {
  const trace = JSON.parse(readFileSync(file, 'utf8')) as HandTrace;
  const results = replayTrace(trace);
  console.log(`\n${file}  (${trace.frames.length} frames, ${trace.userAgent.slice(0, 60)})`);
  console.log('segment   got/expected  pinches  flicks  hand seen');
  for (const [id, r] of Object.entries(results)) {
    const seen = r.frames ? Math.round((r.handFrames / r.frames) * 100) : 0;
    console.log(`${id.padEnd(9)} ${`${r.squeezes}/${r.expected}`.padEnd(13)} ${String(r.pinches).padEnd(8)} ${String(r.flicks).padEnd(7)} ${seen}%`);
  }
}
