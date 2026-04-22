#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(HERE, "../public/unicorn/health-hero-scene.raw.json");
const OUT = resolve(HERE, "../public/unicorn/health-hero-scene.json");

const SPEED_DIVISOR = 3;

const ORANGE = "vec3(1, 0.5372549019607843, 0.30196078431372547)";

const IRIDESCENT_ANIMATED =
  "(0.55 + 0.45 * cos(uTime * 0.35 + gl_FragCoord.xyx * vec3(0.0040, 0.0060, 0.0050) + vec3(0.0, 2.094, 4.188)))";

const IRIDESCENT_STATIC =
  "(0.55 + 0.45 * cos(gl_FragCoord.xyx * vec3(0.0080, 0.0090, 0.0070) + vec3(0.0, 2.094, 4.188)))";

if (!existsSync(RAW)) {
  console.error(`[unicorn] raw scene not found at ${RAW}`);
  console.error(`[unicorn] place the pristine Unicorn Studio export there and re-run.`);
  process.exit(1);
}

const scene = JSON.parse(readFileSync(RAW, "utf8"));

let speedChanges = 0;
for (const layer of scene.layers ?? []) {
  if (typeof layer.speed === "number") {
    layer.speed = +(layer.speed / SPEED_DIVISOR).toFixed(6);
    speedChanges++;
  }
}

let shaderChanges = 0;
for (const layer of scene.layers ?? []) {
  if (!Array.isArray(layer.compiledFragmentShaders)) continue;
  const replacement =
    layer.type === "wisps" ? IRIDESCENT_ANIMATED :
    layer.type === "outline" ? IRIDESCENT_STATIC :
    null;
  if (!replacement) continue;

  layer.compiledFragmentShaders = layer.compiledFragmentShaders.map((src) => {
    if (typeof src !== "string") return src;
    if (!src.includes(ORANGE)) return src;
    shaderChanges++;
    return src.split(ORANGE).join(replacement);
  });
}

writeFileSync(OUT, JSON.stringify(scene));
console.log(
  `[unicorn] transforms applied: ${speedChanges} speed scalings (÷${SPEED_DIVISOR}), ${shaderChanges} iridescent shader replacements`,
);
console.log(`[unicorn] wrote ${OUT}`);
