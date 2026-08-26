import { DECK } from "@/lib/deck";

export type WallpaperPlacement = {
  id: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  opacity: number;
};

export type WallpaperPatternId =
  | "scatter"
  | "scatterDense"
  | "scatterUltra"
  | "monogram"
  | "monogramDense";

export const WALLPAPER_PATTERN_IDS: WallpaperPatternId[] = [
  "scatter",
  "scatterDense",
  "scatterUltra",
  "monogram",
  "monogramDense",
];

/** 9:16 構図内の配置パターン */
export const WALLPAPER_PATTERNS: Record<
  WallpaperPatternId,
  {
    label: string;
    note: string;
    placements: WallpaperPlacement[];
  }
> = {
  scatter: {
    label: "散らし（いま）",
    note: "10枚・余白多めのばら撒き。",
    placements: [
      { id: "heart-01", x: 2, y: 4, size: 28, rotate: -22, opacity: 0.14 },
      { id: "work-08", x: 68, y: 3, size: 26, rotate: 16, opacity: 0.13 },
      { id: "growth-10", x: -2, y: 22, size: 24, rotate: 28, opacity: 0.12 },
      { id: "heart-17", x: 72, y: 18, size: 27, rotate: -12, opacity: 0.14 },
      { id: "growth-08", x: 4, y: 42, size: 22, rotate: -35, opacity: 0.11 },
      { id: "work-13", x: 70, y: 46, size: 25, rotate: 24, opacity: 0.12 },
      { id: "heart-03", x: 0, y: 66, size: 27, rotate: 14, opacity: 0.13 },
      { id: "growth-06", x: 66, y: 64, size: 29, rotate: -20, opacity: 0.13 },
      { id: "work-19", x: 18, y: 84, size: 22, rotate: 8, opacity: 0.11 },
      { id: "heart-13", x: 58, y: 82, size: 24, rotate: -28, opacity: 0.12 },
    ],
  },

  scatterDense: {
    label: "散らし・高密度",
    note: "28枚・小さめ・回転多め。今の散らしを密度アップ。",
    placements: buildDenseScatter(),
  },

  scatterUltra: {
    label: "散らし・超高密度",
    note: "全60種。向きはランダム、位置は均等グリッド＋微小ずれ。本番は scripts/bake-entry-wallpaper.mjs で 1 枚の壁紙に焼く。",
    placements: buildUltraScatter(),
  },

  monogram: {
    label: "モノグラム（整列）",
    note: "5×8＝40種。ほぼ正立で規則正しく並べる。",
    placements: buildMonogramGrid({ cols: 5, rows: 8, size: 15.5, gapX: 1.2, gapY: 1.5, opacity: 0.11, tilt: 0 }),
  },

  monogramDense: {
    label: "モノグラム・高密度",
    note: "6×10＝60種（全デッキ）。小さくびっしり。",
    placements: buildMonogramGrid({
      cols: 6,
      rows: 10,
      size: 13.2,
      gapX: 0.8,
      gapY: 1.0,
      opacity: 0.1,
      tilt: 0,
    }),
  },
};

function buildDenseScatter(): WallpaperPlacement[] {
  const ids = [
    "heart-01", "work-08", "growth-10", "heart-17", "growth-08", "work-13",
    "heart-03", "growth-06", "work-19", "heart-13", "work-03", "growth-04",
    "heart-09", "work-16", "growth-18", "heart-05", "work-06", "growth-01",
    "heart-12", "work-11", "growth-15", "heart-20", "work-01", "growth-07",
    "heart-07", "work-18", "growth-12", "heart-15",
  ];
  // 決まった「ばら撒き」座標（毎回同じ）
  const spots: Array<[number, number, number, number]> = [
    [0, 2, 18, -18], [38, 1, 16, 12], [72, 3, 17, -8],
    [12, 12, 15, 22], [52, 11, 14, -26], [82, 14, 16, 14],
    [-2, 22, 17, -12], [28, 24, 14, 8], [58, 22, 15, -20], [88, 26, 14, 18],
    [6, 34, 15, 16], [40, 36, 16, -14], [70, 34, 14, 24],
    [-4, 46, 16, -22], [22, 48, 14, 10], [48, 46, 15, -6], [78, 48, 16, 20],
    [8, 58, 14, -16], [36, 60, 15, 12], [66, 58, 17, -24], [92, 62, 13, 8],
    [0, 70, 16, 14], [30, 72, 14, -10], [56, 70, 15, 18], [84, 74, 14, -14],
    [14, 84, 15, 6], [46, 86, 16, -18], [74, 84, 15, 22],
  ];
  return ids.map((id, i) => {
    const [x, y, size, rotate] = spots[i]!;
    return {
      id,
      x,
      y,
      size,
      rotate,
      opacity: 0.1 + (i % 5) * 0.012,
    };
  });
}

function buildUltraScatter(): WallpaperPlacement[] {
  const cols = 5;
  const rows = 12; // 60
  const out: WallpaperPlacement[] = [];
  // セル内の小さなずれだけ（大きく飛ばさない → 画面をまんべんなく）
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

  // 余白を均等に割る（はみ出し少なめ）
  const padX = 1.5;
  const padY = 1.2;
  const sizeBase = 11.2;
  const cellW = (100 - padX * 2) / cols;
  const cellH = (100 - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const card = DECK[i];
      if (!card) continue;
      const size = sizeBase + (i % 3) * 0.7;
      // セル中央 + 微小ジッター（奇数列は半セルずらしてレンガ風にしつつ均等）
      const brick = (r % 2) * (cellW * 0.22);
      const x =
        padX + c * cellW + (cellW - size) / 2 + brick + (jx[i] ?? 0);
      const y = padY + r * cellH + (cellH - size) / 2 + (jy[i] ?? 0);
      out.push({
        id: card.id,
        x,
        y,
        size,
        rotate: rotates[i] ?? 0,
        opacity: 0.088 + (i % 5) * 0.008,
      });
    }
  }
  return out;
}

function buildMonogramGrid(opts: {
  cols: number;
  rows: number;
  size: number;
  gapX: number;
  gapY: number;
  opacity: number;
  tilt: number;
}): WallpaperPlacement[] {
  const { cols, rows, size, gapX, gapY, opacity, tilt } = opts;
  const count = cols * rows;
  const cards = DECK.slice(0, count);
  const cellW = (100 - gapX * (cols + 1)) / cols;
  const cellH = (100 - gapY * (rows + 1)) / rows;
  const out: WallpaperPlacement[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const card = cards[i];
      if (!card) continue;
      const x = gapX + c * (cellW + gapX) + (cellW - size) / 2;
      const y = gapY + r * (cellH + gapY) + (cellH - size) * 0.35;
      out.push({
        id: card.id,
        x,
        y,
        size,
        rotate: tilt === 0 ? 0 : (i % 2 === 0 ? -tilt : tilt),
        opacity,
      });
    }
  }
  return out;
}
