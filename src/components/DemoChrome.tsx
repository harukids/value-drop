import Link from "next/link";
import type { ReactNode } from "react";

export function DemoChrome({
  title,
  note,
  extra,
  compact = false,
  children,
}: {
  title: string;
  note?: string;
  extra?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`relative z-[1] mx-auto flex w-full flex-1 flex-col px-4 py-8 ${
        compact
          ? "max-w-lg gap-5 sm:gap-6 sm:py-10"
          : "max-w-2xl gap-4"
      }`}
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-mint">
          見本 · 通信なし
        </p>
        {!compact && (
          <>
            <p className="text-sm font-semibold tracking-wide text-mint">
              Value Drop online
            </p>
            <h1 className="text-2xl font-bold">部屋 DEMO</h1>
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </>
        )}
        <p className="text-sm text-muted">
          {note ??
            "図解と同じダミー（あかり／そうた／みなと）です。部屋には入りません。"}
        </p>
        {extra}
      </header>
      {children}
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/play-preview?view=akari" className="text-mint underline">
          プレイ（あかり）
        </Link>
        <Link href="/play-preview?view=sota" className="text-mint underline">
          プレイ（そうた）
        </Link>
        <Link href="/select-preview" className="text-mint underline">
          選定
        </Link>
        <Link href="/write-preview" className="text-mint underline">
          理由
        </Link>
        <Link href="/result-preview" className="text-mint underline">
          結果（ホスト）
        </Link>
        <Link href="/poster-preview" className="text-mint underline">
          価値観デザイン
        </Link>
        <Link href="/report-preview" className="text-mint underline">
          レポート
        </Link>
        <Link href="/" className="text-mint underline">
          トップへ
        </Link>
      </nav>
    </main>
  );
}
