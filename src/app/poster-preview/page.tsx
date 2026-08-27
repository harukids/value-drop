"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DECK, PILLAR_LABEL, getCard } from "@/lib/deck";
import {
  AKARI_REASON,
  AKARI_STATEMENT,
} from "@/lib/diagram-demo";
import { EntryBgm } from "@/components/EntryBgm";
import { resultPosterDataUrl } from "@/lib/result-poster";
import type { Pillar } from "@/lib/types";

const NAME = "あかり";
const SUB_A = "work-13";
const SUB_B = "growth-18";

export default function PosterPreviewPage() {
  const [mainId, setMainId] = useState("heart-01");
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byPillar = useMemo(() => {
    const map: Record<Pillar, typeof DECK> = {
      heart: [],
      work: [],
      growth: [],
    };
    for (const c of DECK) map[c.pillar].push(c);
    return map;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const url = await resultPosterDataUrl({
            displayName: NAME,
            mainCardId: mainId,
            subCardIds: [SUB_A, SUB_B],
            reason: AKARI_REASON,
            statement: AKARI_STATEMENT,
            handCardIds: [...new Set([mainId, SUB_A, SUB_B, "heart-03", "growth-08"])],
          });
          if (!cancelled) {
            setPreviewUrl(url);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "プレビューに失敗しました");
          }
        } finally {
          if (!cancelled) setRendering(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mainId]);

  return (
    <>
      <EntryBgm />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-mint">見本 · 通信なし</p>
        <h1 className="text-2xl font-bold">価値観デザインの違いを見る</h1>
        <p className="text-sm text-muted">
          ゲーム中にはない確認用です。あかりの見本のまま、メインだけ変えられます。色・線画・下線が揃って変わります。
        </p>
      </header>

      <label className="block space-y-1">
        <span className="text-sm text-muted">メイン</span>
        <select
          className="w-full rounded-xl border border-line bg-panel px-3 py-2"
          value={mainId}
          onChange={(e) => setMainId(e.target.value)}
        >
          {(Object.keys(byPillar) as Pillar[]).map((pillar) => (
            <optgroup key={pillar} label={PILLAR_LABEL[pillar]}>
              {byPillar[pillar].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#0a0c18] p-2">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${NAME}のポスター見本。メインは${getCard(mainId)?.label ?? ""}`}
            className="mx-auto w-full max-w-md rounded-xl"
          />
        ) : (
          <div className="flex aspect-[1080/1527] items-center justify-center text-sm text-muted">
            {rendering ? "見本を描画中…" : "見本を準備中…"}
          </div>
        )}
        {rendering && previewUrl && (
          <p className="pb-2 text-center text-[11px] text-muted">更新中…</p>
        )}
      </div>

      {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/lobby-preview" className="text-mint underline">
          ロビー（進行役）
        </Link>
        <Link href="/play-preview?view=host" className="text-mint underline">
          プレイ（進行役）
        </Link>
        <Link href="/result-preview" className="text-mint underline">
          結果（進行役）
        </Link>
        <Link href="/" className="text-mint underline">
          トップへ
        </Link>
      </div>
    </main>
    </>
  );
}
