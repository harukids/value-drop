"use client";

import { useState } from "react";
import Link from "next/link";

const SAMPLE_HAND = ["自由", "創造", "信頼", "挑戦"];
const SAMPLE_FIELD = ["愛", "影響力", "成長", "感謝", "探究", "直感"];

type Mode = "discard" | "gain";

function SpeakBanner({ script }: { script: string }) {
  return (
    <div className="rounded-xl border border-mint/40 bg-mint/10 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-mint">
        声に出してから確定
      </p>
      <p className="mt-1 text-sm font-bold leading-snug text-[#e8fff8]">
        {script}
      </p>
    </div>
  );
}

function ConfirmSheet({
  script,
  actionLabel,
  onCancel,
  onConfirm,
}: {
  script: string;
  actionLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-[#12162a] p-5 shadow-xl">
        <p className="text-xs font-semibold tracking-wide text-mint">
          ZoomでもOK · 声に出してから
        </p>
        <p className="text-center text-xl font-bold leading-relaxed text-[#f4f7ff]">
          {script}
        </p>
        <p className="text-center text-xs text-muted">
          言い終わったら下のボタンを押してください
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-xl border border-line px-3 py-3 text-sm"
            onClick={onCancel}
          >
            もどる
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-3 py-3 text-sm font-bold text-[#12122a]"
            onClick={onConfirm}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VoicePromptSamplePage() {
  const [mode, setMode] = useState<Mode>("discard");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const verb = mode === "discard" ? "手放します" : "手に入れます";
  const script = selected
    ? `私は「${selected}」を${verb}`
    : `私は「〇〇」を${verb}`;

  const cards = mode === "discard" ? SAMPLE_HAND : SAMPLE_FIELD;

  return (
    <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-mint">
          見本 · 声出し促しUI
        </p>
        <h1 className="text-2xl font-bold">宣言してから確定</h1>
        <p className="text-sm leading-relaxed text-muted">
          おすすめ案（バナー＋確認シート）の見本です。カードを選ぶと台詞が差し替わり、確定前に大きく出ます。
        </p>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "discard"
              ? "bg-accent text-[#16382f]"
              : "border border-line text-muted"
          }`}
          onClick={() => {
            setMode("discard");
            setSelected(null);
            setSheetOpen(false);
            setDoneMsg(null);
          }}
        >
          手放す（捨てる）
        </button>
        <button
          type="button"
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "gain"
              ? "bg-accent text-[#16382f]"
              : "border border-line text-muted"
          }`}
          onClick={() => {
            setMode("gain");
            setSelected(null);
            setSheetOpen(false);
            setDoneMsg(null);
          }}
        >
          手に入れる（場から）
        </button>
      </div>

      <SpeakBanner script={script} />

      <section className="space-y-3 rounded-2xl border-2 border-accent bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-accent">
            {mode === "discard" ? "あなたの手札" : "場のカード"}
          </h2>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
            {mode === "discard" ? "ここで1枚選んで捨てる" : "ここで1枚選んで得る"}
          </span>
        </div>

        <div
          className={`grid gap-2 ${
            mode === "discard" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
          }`}
        >
          {cards.map((label) => {
            const on = selected === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSelected(label);
                  setDoneMsg(null);
                }}
                className={`rounded-xl border px-3 py-4 text-center text-sm font-bold ${
                  on
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-line bg-[#1a2038]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selected}
          className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
          onClick={() => setSheetOpen(true)}
        >
          {mode === "discard" ? "このカードを手放す…" : "このカードを得る…"}
        </button>
      </section>

      {doneMsg && (
        <p className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-sm text-mint">
          {doneMsg}
        </p>
      )}

      <section className="space-y-2 rounded-2xl border border-line bg-panel/60 p-4">
        <h2 className="text-sm font-semibold text-accent">見本のポイント</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>選択中は上のバナーで台詞が差し替わる</li>
          <li>確定前シートで台詞を大きく見せ、声出しのあと押す</li>
          <li>マイク強制はせず、Zoom声出しと両立しやすい</li>
        </ul>
      </section>

      <Link href="/" className="text-sm text-mint underline">
        トップへ
      </Link>

      {sheetOpen && selected && (
        <ConfirmSheet
          script={`私は「${selected}」を${verb}`}
          actionLabel={mode === "discard" ? "手放す（確定）" : "得る（確定）"}
          onCancel={() => setSheetOpen(false)}
          onConfirm={() => {
            setSheetOpen(false);
            setDoneMsg(`（見本）「${selected}」を${verb} — 確定しました`);
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}
