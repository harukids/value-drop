"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DECK, PILLAR_LABEL, getCard } from "@/lib/deck";
import {
  downloadResultPoster,
  getPosterPreviewClasses,
  resultPosterDataUrl,
} from "@/lib/result-poster";
import type { Pillar } from "@/lib/types";

export default function PosterPreviewPage() {
  const [mainId, setMainId] = useState("heart-02");
  const [subA, setSubA] = useState("heart-09");
  const [subB, setSubB] = useState("growth-06");
  const [name, setName] = useState("はるき");
  const [reason, setReason] = useState(
    "自分らしくいられる関係を大切にしたいから。",
  );
  const [statement, setStatement] = useState(
    "わたしは自由と感謝を軸に、成長し続けられる関係を大切にする。自分らしさを手放さず、人と誠実につながる働き方を選ぶ。",
  );
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const main = getCard(mainId);
  const preview = getPosterPreviewClasses(main?.pillar);
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
            displayName: name || "ゲスト",
            mainCardId: mainId,
            subCardIds: [subA, subB],
            reason,
            statement,
            handCardIds: [mainId, subA, subB, "heart-01", "work-08"],
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
  }, [name, mainId, subA, subB, reason, statement]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-mint">プレビュー</p>
        <h1 className="text-2xl font-bold">結果ポスターを見る</h1>
        <p className="text-sm text-muted">
          下は実際のPNGと同じ見本です。メインを変えると色・線画・下線が更新されます。
        </p>
      </header>

      <label className="block space-y-1">
        <span className="text-sm text-muted">表示名</span>
        <input
          className="w-full rounded-xl border border-line bg-panel px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

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

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted">サブ1</span>
          <select
            className="w-full rounded-xl border border-line bg-panel px-3 py-2"
            value={subA}
            onChange={(e) => setSubA(e.target.value)}
          >
            {DECK.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">サブ2</span>
          <select
            className="w-full rounded-xl border border-line bg-panel px-3 py-2"
            value={subB}
            onChange={(e) => setSubB(e.target.value)}
          >
            {DECK.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-muted">理由（わたしの言葉）</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-muted">価値観ステートメント</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#0a0c18] p-2">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="ポスター見本"
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

      <button
        type="button"
        disabled={busy}
        className={`rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50 ${preview.button}`}
        onClick={() =>
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await downloadResultPoster({
                displayName: name || "ゲスト",
                mainCardId: mainId,
                subCardIds: [subA, subB],
                reason,
                statement,
                handCardIds: [mainId, subA, subB, "heart-01", "work-08"],
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "保存に失敗しました");
            } finally {
              setBusy(false);
            }
          })()
        }
      >
        {busy ? "作成中…" : "PNGを保存"}
      </button>

      {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}

      <Link href="/" className="text-sm text-mint underline">
        トップへ
      </Link>
    </main>
  );
}
