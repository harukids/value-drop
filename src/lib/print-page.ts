/** ISO A4 portrait (210×297 mm) — 印刷時に余白少なくフィットする書き出し比率 */
export const PRINT_A4_WIDTH = 1080;
export const PRINT_A4_HEIGHT = Math.round((PRINT_A4_WIDTH * 297) / 210); // 1527

/** Tailwind 等で使う aspect 比（width / height） */
export const PRINT_A4_ASPECT = `${PRINT_A4_WIDTH}/${PRINT_A4_HEIGHT}`;
