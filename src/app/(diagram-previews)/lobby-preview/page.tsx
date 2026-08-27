"use client";

import { useState } from "react";
import { DemoChrome } from "@/components/DemoChrome";
import { EntryBgm } from "@/components/EntryBgm";
import { LineArtCoverBg } from "@/components/LineArtCoverBg";
import { getLobbyDemo } from "@/lib/diagram-demo";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RECOMMENDED_MAX,
  isSeatedPlayer,
  seatedPlayers,
} from "@/lib/types";

export default function LobbyPreviewPage() {
  const { players, me } = getLobbyDemo();
  const [hint, setHint] = useState<string | null>(null);
  const seated = seatedPlayers(players);
  const spectatorHost = players.find((p) => p.is_host && !isSeatedPlayer(p));

  return (
    <>
      <LineArtCoverBg denser pattern="scatterUltra" />
      <EntryBgm />
      <DemoChrome
        title="ロビー見本（進行役）"
        note="開始前の進行役画面です。自分は席に座らず、招待と開始だけ操作します。"
      >
        <section className="space-y-3 rounded-2xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-accent">招待</h2>
          <p className="text-xs text-muted">
            ZoomやLINEに貼る用。入室手順と注意文つきで一括コピーできます。
          </p>
          <button
            type="button"
            className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a]"
            onClick={() => setHint("見本です。部屋には反映しません。")}
          >
            招待文をコピー
          </button>
          <div className="space-y-2">
            <p className="text-xs text-muted">部屋コード</p>
            <p className="rounded-xl bg-background px-3 py-2 text-lg font-bold tracking-[0.2em]">
              DEMO
            </p>
          </div>
          <p className="text-xs text-muted">
            人数 {seated.length} / {MAX_PLAYERS}（開始は{MIN_PLAYERS}人以上、おすすめ
            {MIN_PLAYERS}〜{RECOMMENDED_MAX}）
            {spectatorHost ? ` ／ 進行役 ${spectatorHost.display_name}` : ""}
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-accent">席順（隣＝次の人）</h2>
          {spectatorHost && (
            <p className="text-xs text-muted">
              進行役 {spectatorHost.display_name}
              {spectatorHost.id === me.id ? "（あなた）" : ""}
              は席に座りません。
            </p>
          )}
          <ul className="space-y-2">
            {seated.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2"
              >
                <span className="font-semibold">
                  {i + 1}. {p.display_name}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a]"
          onClick={() => setHint("見本です。部屋には反映しません。")}
        >
          ゲームを開始する
        </button>
        {hint && <p className="text-sm text-mint">{hint}</p>}
      </DemoChrome>
    </>
  );
}
