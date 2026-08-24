import { getCard } from "@/lib/deck";
import { PRINT_A4_HEIGHT, PRINT_A4_WIDTH } from "@/lib/print-page";
import type { Pillar } from "@/lib/types";

export type PosterInput = {
  displayName: string;
  mainCardId: string | null;
  subCardIds: string[];
  reason: string | null;
  /** AIが整えた価値観ステートメント */
  statement?: string | null;
  /** 選定時点の手札（最終5枚） */
  handCardIds?: string[];
};

type PillarTheme = {
  night: [string, string, string, string];
  glows: Array<[number, number, number, string]>;
  band: string[];
  frame: string[];
  accentLine: string[];
  title: string;
  name: string;
  mainLabel: string;
  mainCaption: string;
  subFill: [string, string];
  subStroke: [string, string];
  reasonStroke: string;
  reasonTitle: string;
  footer: string;
};

/** 柱ごとのポスター配色（クライアント描画のみ・軽い） */
export const PILLAR_POSTER_THEME: Record<Pillar, PillarTheme> = {
  // 心: ローズ主軸 + オレンジ & イエロー
  heart: {
    night: ["#1c0810", "#4a1230", "#6a1e28", "#2a1008"],
    glows: [
      [180, 220, 540, "rgba(255,90,140,0.65)"],
      [780, 180, 480, "rgba(255,130,90,0.5)"],
      [860, 720, 520, "rgba(255,190,70,0.42)"],
      [220, 920, 460, "rgba(255,220,100,0.35)"],
      [520, 480, 380, "rgba(255,110,150,0.35)"],
    ],
    band: [
      "rgba(255,90,140,0.0)",
      "rgba(255,90,140,0.28)",
      "rgba(255,140,90,0.24)",
      "rgba(255,200,80,0.2)",
      "rgba(255,230,120,0.14)",
      "rgba(255,90,140,0.0)",
    ],
    frame: [
      "rgba(255,110,160,0.95)",
      "rgba(255,140,90,0.9)",
      "rgba(255,200,80,0.9)",
      "rgba(255,230,130,0.85)",
    ],
    accentLine: ["#ff6a9a", "#ff8a50", "#ffd24a"],
    title: "#ffd0e0",
    name: "#fff0e8",
    mainLabel: "#ffffff",
    mainCaption: "#ff9aba",
    subFill: ["rgba(255,100,140,0.28)", "rgba(255,170,80,0.24)"],
    subStroke: ["rgba(255,130,170,0.85)", "rgba(255,200,90,0.8)"],
    reasonStroke: "rgba(255,210,100,0.5)",
    reasonTitle: "#ffe08a",
    footer: "#d0a0a8",
  },
  // 仕事: ブルー主軸 + ライトブルー & 紫
  work: {
    night: ["#080c22", "#101848", "#1a2060", "#0c1030"],
    glows: [
      [160, 200, 540, "rgba(70,140,255,0.65)"],
      [820, 180, 480, "rgba(120,210,255,0.5)"],
      [780, 760, 520, "rgba(160,110,255,0.48)"],
      [240, 980, 440, "rgba(180,140,255,0.35)"],
      [500, 500, 360, "rgba(90,180,255,0.32)"],
    ],
    band: [
      "rgba(70,140,255,0.0)",
      "rgba(70,150,255,0.28)",
      "rgba(120,210,255,0.22)",
      "rgba(150,120,255,0.22)",
      "rgba(190,150,255,0.16)",
      "rgba(70,140,255,0.0)",
    ],
    frame: [
      "rgba(80,160,255,0.95)",
      "rgba(120,210,255,0.9)",
      "rgba(160,120,255,0.9)",
      "rgba(200,160,255,0.85)",
    ],
    accentLine: ["#4a8fff", "#7ad4ff", "#b48cff"],
    title: "#d0e4ff",
    name: "#eef4ff",
    mainLabel: "#ffffff",
    mainCaption: "#8eb8ff",
    subFill: ["rgba(80,160,255,0.28)", "rgba(160,120,255,0.24)"],
    subStroke: ["rgba(110,190,255,0.85)", "rgba(180,140,255,0.8)"],
    reasonStroke: "rgba(170,140,255,0.5)",
    reasonTitle: "#c8b0ff",
    footer: "#98a8d0",
  },
  // 成長: グリーン主軸 + イエロー & エメラルドグリーン
  growth: {
    night: ["#041810", "#0a3020", "#0e4030", "#082818"],
    glows: [
      [180, 220, 540, "rgba(40,200,140,0.6)"],
      [820, 180, 480, "rgba(50,230,190,0.5)"],
      [760, 780, 520, "rgba(210,230,80,0.42)"],
      [240, 960, 440, "rgba(80,255,200,0.35)"],
      [500, 480, 360, "rgba(120,220,100,0.32)"],
    ],
    band: [
      "rgba(40,200,140,0.0)",
      "rgba(40,210,150,0.28)",
      "rgba(50,230,190,0.24)",
      "rgba(180,230,70,0.2)",
      "rgba(230,240,100,0.16)",
      "rgba(40,200,140,0.0)",
    ],
    frame: [
      "rgba(50,220,160,0.95)",
      "rgba(40,240,200,0.9)",
      "rgba(180,230,70,0.9)",
      "rgba(230,240,110,0.85)",
    ],
    accentLine: ["#2ecf98", "#3aefc8", "#e8f050"],
    title: "#c8f8e0",
    name: "#ecfff6",
    mainLabel: "#ffffff",
    mainCaption: "#6ee8b8",
    subFill: ["rgba(40,210,160,0.28)", "rgba(200,230,70,0.22)"],
    subStroke: ["rgba(60,240,190,0.85)", "rgba(220,240,90,0.8)"],
    reasonStroke: "rgba(210,235,80,0.5)",
    reasonTitle: "#e8f060",
    footer: "#88c0a8",
  },
};

export function getPosterTheme(pillar: Pillar | null | undefined): PillarTheme {
  return PILLAR_POSTER_THEME[pillar ?? "heart"];
}

/** プレビュー用 Tailwind クラス */
export function getPosterPreviewClasses(pillar: Pillar | null | undefined): {
  card: string;
  title: string;
  main: string;
  button: string;
} {
  switch (pillar) {
    case "work":
      return {
        card: "border-sky-300/25 bg-gradient-to-br from-[#1a3a8a]/85 via-[#2a60c8]/55 to-[#6a40b8]/75 shadow-[0_0_48px_rgba(100,160,255,0.35)]",
        title: "text-sky-100/85",
        main: "bg-gradient-to-r from-[#4a8fff] via-[#7ad4ff] to-[#b48cff] bg-clip-text text-transparent",
        button:
          "bg-gradient-to-r from-[#4a8fff] via-[#7ad4ff] to-[#b48cff] text-[#0a1028]",
      };
    case "growth":
      return {
        card: "border-emerald-300/25 bg-gradient-to-br from-[#0a4030]/90 via-[#18a070]/50 to-[#88a820]/70 shadow-[0_0_48px_rgba(50,220,160,0.32)]",
        title: "text-emerald-100/85",
        main: "bg-gradient-to-r from-[#2ecf98] via-[#3aefc8] to-[#e8f050] bg-clip-text text-transparent",
        button:
          "bg-gradient-to-r from-[#2ecf98] via-[#3aefc8] to-[#e8f050] text-[#042018]",
      };
    case "heart":
    default:
      return {
        card: "border-rose-300/25 bg-gradient-to-br from-[#6a1840]/90 via-[#c04060]/55 to-[#e09030]/70 shadow-[0_0_48px_rgba(255,120,100,0.35)]",
        title: "text-rose-100/85",
        main: "bg-gradient-to-r from-[#ff6a9a] via-[#ff8a50] to-[#ffd24a] bg-clip-text text-transparent",
        button:
          "bg-gradient-to-r from-[#ff6a9a] via-[#ff8a50] to-[#ffd24a] text-[#1a0a10]",
      };
  }
}

/** チームレポート等のカードタイル用（個人ポスターより控えめ） */
export function getValueCardPillarTone(pillar: Pillar | null | undefined): {
  figure: string;
  art: string;
  border: string;
  artFrom: string;
  artTo: string;
} {
  switch (pillar) {
    case "work":
      return {
        figure: "border-sky-300/40 bg-[#101828]",
        art: "bg-gradient-to-br from-[#1a3a8a]/50 to-[#0c1020]",
        border: "rgba(110,168,255,0.55)",
        artFrom: "#1a3a8a",
        artTo: "#0c1020",
      };
    case "growth":
      return {
        figure: "border-emerald-300/40 bg-[#0e1a16]",
        art: "bg-gradient-to-br from-[#0a4030]/55 to-[#0c1020]",
        border: "rgba(126,240,212,0.5)",
        artFrom: "#0a4030",
        artTo: "#0c1020",
      };
    case "heart":
    default:
      return {
        figure: "border-rose-300/40 bg-[#1a1018]",
        art: "bg-gradient-to-br from-[#4a1830]/55 to-[#0c1020]",
        border: "rgba(255,142,200,0.5)",
        artFrom: "#4a1830",
        artTo: "#0c1020",
      };
  }
}

/** 行頭禁則（改行文頭に来たら前行へぶら下げる） */
const LINE_START_KINSOKU =
  /[、。，．！？）」』〉》〕】ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ゛゜ー…‥･・]/;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (LINE_START_KINSOKU.test(ch)) {
        // ぶら下がり: 句読点などは前の行に残してわずかに枠外へ
        lines.push(line + ch);
        line = "";
      } else {
        lines.push(line);
        line = ch;
      }
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 理由文が枠に収まるフォントサイズを探す（足りるときは縮小しない） */
function fitWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseSize: number,
  minSize: number,
): { lines: string[]; size: number; lineHeight: number } {
  let size = baseSize;
  while (size >= minSize) {
    ctx.font = `500 ${size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
    const lineHeight = Math.round(size * 1.35);
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length * lineHeight <= maxHeight) {
      return { lines, size, lineHeight };
    }
    size -= 2;
  }
  ctx.font = `500 ${minSize}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
  const lineHeight = Math.round(minSize * 1.35);
  const lines = wrapText(ctx, text, maxWidth);
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  return { lines: lines.slice(0, maxLines), size: minSize, lineHeight };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** ポスター用は v3。カード専用 → 柱フォールバック */
async function loadLineArt(cardId: string, pillar: Pillar): Promise<HTMLImageElement | null> {
  const candidates = [
    `/illustrations/v3/${cardId}.svg?v=20260822d`,
    `/illustrations/v3/${cardId}.png`,
    `/illustrations/${cardId}.svg`,
    `/illustrations/${cardId}.png`,
    `/illustrations/pillar-${pillar}.svg`,
    `/illustrations/pillar-${pillar}.png`,
  ];
  for (const src of candidates) {
    const img = await loadImage(src);
    if (img) return img;
  }
  return null;
}

/** ポスターを描画して Canvas を返す */
export async function renderResultPoster(
  input: PosterInput,
): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore font loading failures
    }
  }

  const width = PRINT_A4_WIDTH;
  const height = PRINT_A4_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作れませんでした");

  const main = input.mainCardId ? getCard(input.mainCardId) : null;
  const pillar = main?.pillar ?? "heart";
  const theme = getPosterTheme(pillar);
  const subs = (input.subCardIds ?? [])
    .map((id) => getCard(id))
    .filter(Boolean);

  // 柱ベースの夜空
  const night = ctx.createLinearGradient(0, 0, width, height);
  night.addColorStop(0, theme.night[0]);
  night.addColorStop(0.35, theme.night[1]);
  night.addColorStop(0.7, theme.night[2]);
  night.addColorStop(1, theme.night[3]);
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, width, height);

  for (const [x, y, r, color] of theme.glows) {
    drawGlow(ctx, x, y, r, color);
  }

  const band = ctx.createLinearGradient(0, 200, width, 1100);
  theme.band.forEach((c, i) => {
    band.addColorStop(i / Math.max(theme.band.length - 1, 1), c);
  });
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);

  // 白線イラスト — 「名前」と「メイン語」のあいだ（大きめ・透過で透かし）
  if (input.mainCardId) {
    const art = await loadLineArt(input.mainCardId, pillar);
    if (art) {
      const artSize = 650;
      const ax = (width - artSize) / 2;
      const ay = 100;
      ctx.save();
      ctx.globalAlpha = 0.29;
      ctx.drawImage(art, ax, ay, artSize, artSize);
      ctx.restore();
    }
  }

  // 外枠
  const frame = ctx.createLinearGradient(80, 80, width - 80, height - 80);
  theme.frame.forEach((c, i) => {
    frame.addColorStop(i / Math.max(theme.frame.length - 1, 1), c);
  });
  ctx.strokeStyle = frame;
  ctx.lineWidth = 6;
  roundRect(ctx, 56, 56, width - 112, height - 112, 42);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, 78, 78, width - 156, height - 156, 34);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = theme.title;
  ctx.font = "600 34px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
  ctx.fillText("わたしの価値観", width / 2, 155);

  ctx.fillStyle = theme.name;
  ctx.font = "500 28px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
  ctx.fillText(input.displayName, width / 2, 200);

  // メイン語 — 名前とのあいだを空け、下線は文字サイズに追従
  const mainLabel = main?.label ?? "—";
  const mainCy = 555;
  ctx.fillStyle = theme.mainLabel;
  const { size: mainSize, width: mainTextW } = fitCenterText(
    ctx,
    mainLabel,
    width / 2,
    mainCy,
    width - 220,
    120,
  );

  const underlineY = mainCy + mainSize * 0.52 + 18;
  const halfLine = Math.max(64, Math.min(mainTextW * 0.42, 200));
  const lineGrad = ctx.createLinearGradient(
    width / 2 - halfLine,
    0,
    width / 2 + halfLine,
    0,
  );
  theme.accentLine.forEach((c, i) => {
    lineGrad.addColorStop(i / Math.max(theme.accentLine.length - 1, 1), c);
  });
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(width / 2 - halfLine, underlineY);
  ctx.lineTo(width / 2 + halfLine, underlineY);
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.mainCaption;
  ctx.font = "600 22px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
  ctx.fillText("MAIN VALUE", width / 2, underlineY + 42);

  // MAIN VALUE との余白を少し詰めて、下の文章欄に余裕を渡す
  const subY = Math.max(700, underlineY + 56);
  const boxW = 360;
  const gap = 40;
  const startX = (width - (boxW * 2 + gap)) / 2;

  subs.slice(0, 2).forEach((sub, i) => {
    const x = startX + i * (boxW + gap);
    ctx.fillStyle = "rgba(12, 14, 28, 0.45)";
    roundRect(ctx, x, subY, boxW, 140, 24);
    ctx.fill();
    ctx.fillStyle = theme.subFill[i] ?? theme.subFill[0];
    roundRect(ctx, x, subY, boxW, 140, 24);
    ctx.fill();
    ctx.strokeStyle = theme.subStroke[i] ?? theme.subStroke[0];
    ctx.lineWidth = 2;
    roundRect(ctx, x, subY, boxW, 140, 24);
    ctx.stroke();

    ctx.fillStyle = "#dce6ff";
    ctx.font = "600 22px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("SUB", x + boxW / 2, subY + 42);

    ctx.fillStyle = "#ffffff";
    fitCenterText(ctx, sub?.label ?? "—", x + boxW / 2, subY + 95, boxW - 40, 48);
    ctx.textBaseline = "alphabetic";
  });

  // 内枠下辺の少し上に日付。A4縦に合わせて理由欄を伸ばす
  const dateY = height - 102;
  const boxTop = Math.min(subY + 158, 860);
  const reason = (input.reason ?? "").trim() || "（理由未入力）";
  const statement = (input.statement ?? "").trim();
  const finalFiveReserve = 52;
  const boxH = Math.max(200, dateY - 40 - boxTop - finalFiveReserve);
  ctx.fillStyle = "rgba(10, 12, 28, 0.55)";
  roundRect(ctx, 120, boxTop, width - 240, boxH, 28);
  ctx.fill();
  ctx.strokeStyle = theme.reasonStroke;
  ctx.lineWidth = 2;
  roundRect(ctx, 120, boxTop, width - 240, boxH, 28);
  ctx.stroke();

  const boxPadX = 160;
  const maxW = width - boxPadX * 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  if (statement) {
    // 二段: 本人の言葉（小）＋ステートメント（主）
    const wordsTop = boxTop + 28;
    ctx.fillStyle = theme.reasonTitle;
    ctx.font = "700 18px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
    ctx.fillText("わたしの言葉", width / 2, wordsTop);

    const wordsBodyTop = wordsTop + 28;
    const wordsMaxH = Math.max(36, Math.floor(boxH * 0.28));
    ctx.fillStyle = "rgba(238,242,255,0.78)";
    const wordsFit = fitWrappedText(ctx, reason, maxW, wordsMaxH, 22, 14);
    ctx.font = `500 ${wordsFit.size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
    wordsFit.lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, wordsBodyTop + i * wordsFit.lineHeight);
    });

    const stmtTitleTop =
      wordsBodyTop + wordsFit.lines.length * wordsFit.lineHeight + 22;
    ctx.fillStyle = theme.reasonTitle;
    ctx.font = "700 22px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
    ctx.fillText("価値観ステートメント", width / 2, stmtTitleTop);

    const stmtBodyTop = stmtTitleTop + 34;
    const stmtMaxH = Math.max(
      40,
      boxTop + boxH - stmtBodyTop - 24,
    );
    ctx.fillStyle = "#eef2ff";
    const stmtFit = fitWrappedText(ctx, statement, maxW, stmtMaxH, 28, 15);
    ctx.font = `500 ${stmtFit.size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
    stmtFit.lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, stmtBodyTop + i * stmtFit.lineHeight);
    });
  } else {
    ctx.fillStyle = theme.reasonTitle;
    ctx.font = "700 24px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
    ctx.fillText("なぜ、これを大切にするのか", width / 2, boxTop + 48);

    const reasonTextTop = boxTop + 78;
    const reasonMaxH = Math.max(40, boxH - (reasonTextTop - boxTop) - 28);
    ctx.fillStyle = "#eef2ff";
    const fitted = fitWrappedText(ctx, reason, maxW, reasonMaxH, 30, 16);
    ctx.font = `500 ${fitted.size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
    fitted.lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, reasonTextTop + i * fitted.lineHeight);
    });
  }
  ctx.textBaseline = "alphabetic";

  // 最終5枚（理由欄の下・小さめ）
  const handIds = (input.handCardIds ?? []).slice(0, 5);
  const handLabels = handIds
    .map((id) => getCard(id)?.label)
    .filter((label): label is string => Boolean(label));
  if (handLabels.length > 0) {
    ctx.fillStyle = theme.footer;
    ctx.font = "500 18px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
    ctx.fillText(handLabels.join("  ·  "), width / 2, boxTop + boxH + 34);
  }

  ctx.fillStyle = theme.footer;
  ctx.font = "500 22px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif";
  const date = new Date().toLocaleDateString("ja-JP");
  ctx.fillText(date, width / 2, dateY);

  return canvas;
}

export async function resultPosterDataUrl(input: PosterInput): Promise<string> {
  const canvas = await renderResultPoster(input);
  return canvas.toDataURL("image/png");
}

/** 壁に貼れる縦ポスター（PNG）を生成してダウンロード */
export async function downloadResultPoster(input: PosterInput): Promise<void> {
  const canvas = await renderResultPoster(input);
  const main = input.mainCardId ? getCard(input.mainCardId) : null;
  const mainLabel = main?.label ?? "価値観";

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("画像の保存に失敗しました"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `価値観_${input.displayName}_${mainLabel}.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const g = ctx.createRadialGradient(x, y, 10, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitCenterText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  baseSize: number,
): { size: number; width: number } {
  let size = baseSize;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  while (size > 36) {
    ctx.font = `700 ${size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  ctx.font = `700 ${size}px 'Zen Maru Gothic', 'Hiragino Sans', sans-serif`;
  const measured = ctx.measureText(text).width;
  ctx.fillText(text, cx, cy);
  return { size, width: measured };
}
