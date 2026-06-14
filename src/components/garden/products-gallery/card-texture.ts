import * as THREE from "three";
import type { GalleryProduct } from "./gallery-data";

export const CARD_ASPECT = 0.8;

const BASE_W = 640;
const BASE_H = Math.round(BASE_W / CARD_ASPECT);
const SCALE = 2;
const W = BASE_W * SCALE;
const H = BASE_H * SCALE;
const RADIUS = 34 * SCALE;
const PAD = 40 * SCALE;

const cache = new Map<string, THREE.CanvasTexture>();
let maxAnisotropy = 8;

export function setCardAnisotropy(value: number) {
  maxAnisotropy = Math.max(1, value);
  for (const tex of cache.values()) {
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFrame(ctx: CanvasRenderingContext2D, product: GalleryProduct) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundedRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#15161c");
  bg.addColorStop(1, "#0a0a0d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, product: GalleryProduct) {
  ctx.save();
  roundedRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();

  const footer = ctx.createLinearGradient(0, H * 0.45, 0, H);
  footer.addColorStop(0, "rgba(6,6,9,0)");
  footer.addColorStop(0.55, "rgba(6,6,9,0.72)");
  footer.addColorStop(1, "rgba(4,4,6,0.96)");
  ctx.fillStyle = footer;
  ctx.fillRect(0, H * 0.4, W, H * 0.6);

  ctx.fillStyle = product.accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(PAD, H - PAD - 150 * SCALE, 46 * SCALE, 4 * SCALE);
  ctx.globalAlpha = 1;

  ctx.font = `300 ${22 * SCALE}px 'Geist', system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textBaseline = "alphabetic";
  const kicker = product.retired
    ? "RETIRED"
    : product.external
      ? "PRODUCT"
      : "SITE";
  ctx.fillText(spaced(kicker), PAD, H - PAD - 108 * SCALE);

  ctx.font = `600 ${52 * SCALE}px 'Geist', system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(product.title, PAD, H - PAD - 48 * SCALE);

  ctx.font = `400 ${26 * SCALE}px 'Geist', system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  wrapText(ctx, product.description, PAD, H - PAD - 8 * SCALE, W - PAD * 2, 32 * SCALE, 1);

  ctx.restore();

  ctx.save();
  roundedRect(ctx, SCALE, SCALE, W - SCALE * 2, H - SCALE * 2, RADIUS - SCALE);
  ctx.lineWidth = 2 * SCALE;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  ctx.restore();
}

function spaced(text: string): string {
  return text.split("").join("  ");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = words[i];
      if (lines >= maxLines - 1) {
        let tail = line;
        for (let j = i + 1; j < words.length; j++) tail += ` ${words[j]}`;
        while (ctx.measureText(`${tail}…`).width > maxWidth && tail.length > 1) {
          tail = tail.slice(0, -1);
        }
        ctx.fillText(words.length - 1 > i ? `${tail}…` : tail, x, y + lines * lineHeight);
        return;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineHeight);
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
) {
  const target = W / (H * 0.92);
  const source = img.width / img.height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (source > target) {
    sw = img.height * target;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / target;
    sy = 0;
  }
  ctx.save();
  roundedRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H * 0.92);
  ctx.restore();
}

export function getCardTexture(product: GalleryProduct): THREE.CanvasTexture {
  const cached = cache.get(product.title);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  cache.set(product.title, texture);

  if (!ctx) return texture;

  drawFrame(ctx, product);
  drawLabel(ctx, product);
  texture.needsUpdate = true;

  if (product.image) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      drawFrame(ctx, product);
      coverDraw(ctx, img);
      drawLabel(ctx, product);
      texture.needsUpdate = true;
    };
    img.src = product.image;
  }

  return texture;
}

export function disposeCardTextures() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}
