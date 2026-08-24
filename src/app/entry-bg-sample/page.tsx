"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LineArtCoverBg } from "@/components/LineArtCoverBg";
import {
  WALLPAPER_PATTERNS,
  type WallpaperPatternId,
} from "@/lib/line-art-wallpapers";

const PATTERN_ORDER: WallpaperPatternId[] = [
  "scatter",
  "scatterDense",
  "scatterUltra",
  "monogram",
  "monogramDense",
];

function FakeEntryUi({ compact }: { compact?: boolean }) {
  return (
    <div className={`relative z-[1] space-y-2 ${compact ? "p-2" : "p-4"}`}>
      <p className="text-[10px] font-semibold tracking-wide text-mint">
        Value Drop online
      </p>
      {!compact && (
        <>
          <h2 className="text-lg font-bold leading-tight">
            価値観を選び
            <br />
            言葉にする
          </h2>
          <div className="rounded-xl border border-line bg-panel/90 p-3 backdrop-blur-[2px]">
            <p className="text-xs text-muted">表示名 · 部屋を作る …</p>
          </div>
        </>
      )}
    </div>
  );
}

function Frame({
  label,
  note,
  wide,
  compact,
  children,
}: {
  label: string;
  note?: string;
  wide?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div>
        <p className="text-xs font-semibold text-mint">{label}</p>
        {note && (
          <p className="text-[11px] leading-relaxed text-muted">{note}</p>
        )}
      </div>
      <div
        className={`relative overflow-hidden rounded-2xl border border-line bg-[#0b1020] ${
          wide
            ? "aspect-[16/9]"
            : compact
              ? "aspect-[9/16]"
              : "aspect-[9/16] max-h-[520px]"
        }`}
      >
        {children}
        <FakeEntryUi compact={compact} />
      </div>
    </section>
  );
}

export default function EntryBgSamplePage() {
  return (
    <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-mint">
          見本 · 全パターン比較
        </p>
        <h1 className="text-2xl font-bold">入場背景ウォールペーパー</h1>
        <p className="text-sm leading-relaxed text-muted">
          全5案の比較です。本番トップ／ロビーは
          <span className="text-mint"> 散らし・超高密度 </span>
          で確定しています。
        </p>

        <nav className="flex flex-wrap gap-2 text-sm">
          {PATTERN_ORDER.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg border border-line px-2.5 py-1 text-xs text-mint"
            >
              {WALLPAPER_PATTERNS[id].label}
            </a>
          ))}
        </nav>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {PATTERN_ORDER.map((id) => (
            <Link
              key={`try-${id}`}
              href={`/?bg=${id}`}
              className="text-mint underline"
            >
              実機·{WALLPAPER_PATTERNS[id].label}
            </Link>
          ))}
        </div>
      </header>

      {/* 一覧：5つ並べて一目比較 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-accent">一覧（縦）</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PATTERN_ORDER.map((id) => {
            const p = WALLPAPER_PATTERNS[id];
            return (
              <a key={`grid-${id}`} href={`#${id}`} className="block">
                <Frame label={p.label} compact>
                  <LineArtCoverBg mode="preview" pattern={id} />
                </Frame>
              </a>
            );
          })}
        </div>
      </section>

      {/* 詳細：各パターン 縦+横 */}
      {PATTERN_ORDER.map((id, index) => {
        const p = WALLPAPER_PATTERNS[id];
        return (
          <div
            key={id}
            id={id}
            className="scroll-mt-6 space-y-4 border-t border-line pt-8"
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted">
                {index + 1} / {PATTERN_ORDER.length}
              </p>
              <h2 className="text-lg font-bold">{p.label}</h2>
              <p className="text-sm text-muted">{p.note}</p>
              <Link href={`/?bg=${id}`} className="text-sm text-mint underline">
                このパターンをトップで実機確認
              </Link>
            </div>
            <Frame label="縦（9:16）">
              <LineArtCoverBg mode="preview" pattern={id} />
            </Frame>
            <Frame label="横（16:9 cover）" wide>
              <LineArtCoverBg mode="preview" pattern={id} denser />
            </Frame>
          </div>
        );
      })}

      <Link href="/" className="text-sm text-mint underline">
        トップへ
      </Link>
    </main>
  );
}
