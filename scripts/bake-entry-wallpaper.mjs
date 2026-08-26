/**
 * エントリー背景の scatterUltra（カード60枚ばら撒き）を 1 枚の WebP にする。
 * 配置は src/lib/line-art-wallpapers.ts の buildUltraScatter と同じ。
 *
 *   node scripts/bake-entry-wallpaper.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const v3Dir = join(root, "public/illustrations/v3");
const outDir = join(root, "public/illustrations/wallpapers");

const W = 1080;
const H = 1920;

const DECK_IDS = [
  ...Array.from({ length: 20 }, (_, i) => `heart-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `work-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `growth-${String(i + 1).padStart(2, "0")}`),
];

function placements() {
  const cols = 5;
  const rows = 12;
  const jx = [
    -1.2, 0.8, -0.5, 1.1, -0.9, 0.4, 1.0, -0.7, 0.2, -1.0, 0.6, -0.3, 1.2,
    -0.8, 0.5, -1.1, 0.9, -0.4, 0.7, -0.6, 1.0, -0.2, 0.3, -0.9, 0.8, -1.2,
    0.5, -0.7, 1.1, -0.4, 0.6, -0.8, 0.2, -1.0, 0.9, -0.5, 0.4, -0.3, 1.0,
    -0.6, 0.7, -1.1, 0.3, -0.9, 0.8, -0.2, 0.5, -0.7, 1.2, -0.4, 0.6, -0.8,
    0.9, -0.5, 0.3, -1.0, 0.7, -0.6, 0.4, -0.3,
  ];
  const jy = [
    0.6, -0.9, 0.3, -0.5, 1.0, -0.7, 0.4, -1.1, 0.8, -0.2, 0.5, -0.8, 0.9,
    -0.4, 0.2, -1.0, 0.7, -0.6, 1.1, -0.3, 0.5, -0.9, 0.4, -0.7, 0.8, -0.5,
    0.3, -1.2, 0.6, -0.4, 0.9, -0.8, 0.2, -0.6, 1.0, -0.3, 0.7, -0.9, 0.4,
    -0.5, 0.8, -0.2, 0.6, -1.0, 0.3, -0.7, 0.9, -0.4, 0.5, -0.8, 0.2, -0.6,
    1.1, -0.3, 0.7, -0.9, 0.4, -0.5, 0.8, -0.2,
  ];
  const rotates = [
    -24, 18, -8, 26, -16, 12, -28, 6, 22, -14, 10, -20, 28, -6, 16, -22, 8,
    -18, 24, -10, 14, -26, 4, 20, -12, 18, -8, 26, -16, 10, -24, 6, 22, -14,
    12, -20, 28, -4, 16, -22, 8, -18, 24, -10, 14, -26, 4, 20, -12, 18, -8,
    26, -16, 10, -24, 6, 22, -14, 12, -20,
  ];
  const padX = 1.5;
  const padY = 1.2;
  const sizeBase = 11.2;
  const cellW = (100 - padX * 2) / cols;
  const cellH = (100 - padY * 2) / rows;
  const out = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const id = DECK_IDS[i];
      if (!id) continue;
      const size = sizeBase + (i % 3) * 0.7;
      const brick = (r % 2) * (cellW * 0.22);
      out.push({
        id,
        x: padX + c * cellW + (cellW - size) / 2 + brick + (jx[i] ?? 0),
        y: padY + r * cellH + (cellH - size) / 2 + (jy[i] ?? 0),
        size,
        rotate: rotates[i] ?? 0,
      });
    }
  }
  return out;
}

function innerMarkup(svg) {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
}

function buildSvg() {
  const groups = placements().map((p) => {
    const raw = readFileSync(join(v3Dir, `${p.id}.svg`), "utf8");
    const cardW = (p.size / 100) * W;
    const x = (p.x / 100) * W;
    const y = (p.y / 100) * H;
    const cx = cardW / 2;
    return `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${p.rotate} ${cx.toFixed(2)} ${cx.toFixed(2)})">
  <svg width="${cardW.toFixed(2)}" height="${cardW.toFixed(2)}" viewBox="0 0 512 512">${innerMarkup(raw)}</svg>
</g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${groups.join("\n")}
</svg>
`;
}

const svg = buildSvg();
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "scatter-ultra.svg"), svg);

const webp = await sharp(Buffer.from(svg))
  .resize(W, H)
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toBuffer();
writeFileSync(join(outDir, "scatter-ultra.webp"), webp);

console.log(
  `baked ${placements().length} cards →`,
  `svg ${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB,`,
  `webp ${(webp.length / 1024).toFixed(1)}KB`,
);
