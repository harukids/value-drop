"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode, normalizeRoomCode } from "@/lib/room-code";
import { isSupabaseConfigured, createBrowserClient } from "@/lib/supabase/client";
import { savePlayerId } from "@/lib/player-storage";
import { joinRoomAsGuest } from "@/lib/join-room";
import { DECK } from "@/lib/deck";
import { HomeEntryBg } from "@/components/HomeEntryBg";
import { LineArtCoverBg } from "@/components/LineArtCoverBg";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function createRoom() {
    setError(null);
    const displayName = name.trim() || "ホスト";
    if (!configured) {
      setError("先に .env.local で Supabase を設定してください。");
      return;
    }
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const code = generateRoomCode();
      const playerId = crypto.randomUUID();

      const { error: roomError } = await supabase.from("rooms").insert({
        code,
        phase: "LOBBY",
        seat_order: [playerId],
        host_id: playerId,
        field: [],
        deny_count: 0,
      });
      if (roomError) throw roomError;

      const { error: playerError } = await supabase.from("players").insert({
        id: playerId,
        room_code: code,
        display_name: displayName,
        seat_index: 0,
        is_host: true,
        hand: [],
      });
      if (playerError) throw playerError;

      savePlayerId(code, playerId);
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "部屋を作れませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    setError(null);
    const code = normalizeRoomCode(joinCode);
    if (!code) {
      setError("部屋コードを入力してください");
      return;
    }
    if (!configured) {
      setError("先に .env.local で Supabase を設定してください。");
      return;
    }
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      await joinRoomAsGuest(supabase, code, name);
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "入室できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Suspense fallback={<LineArtCoverBg pattern="scatterUltra" />}>
        <HomeEntryBg />
      </Suspense>
      <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-mint">
          Value Drop online
        </p>
        <h1 className="text-3xl font-bold leading-tight text-foreground">
          価値観を選び
          <br />
          言葉にする
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Zoomなどで話しながら、各自のブラウザでカードを取ります。デッキ{" "}
          {DECK.length}{" "}
          枚のカードからあなたの価値観を掘り出してゆく、ゲーム方式のワークです。
        </p>
      </header>

      {!configured && (
        <div className="rounded-xl border border-line bg-panel p-4 text-sm text-muted">
          <p className="font-semibold text-accent">セットアップが必要です</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Supabase プロジェクトを作成</li>
            <li>
              <code className="text-foreground">supabase/schema.sql</code> を実行
            </li>
            <li>
              <code className="text-foreground">.env.local.example</code> をコピーしてキーを入れる
            </li>
          </ol>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-line bg-panel p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-mint">表示名</span>
          <input
            className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-foreground outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: はるき"
            maxLength={24}
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={createRoom}
          className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#b794ff] to-[#ff8ec8] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-50"
        >
          部屋を作る（ホスト）
        </button>

        <div className="relative py-2 text-center text-xs text-muted">
          <span className="bg-panel px-2">または</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-line" />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-mint">部屋コード</span>
          <input
            className="w-full rounded-xl border border-line bg-background px-3 py-2.5 uppercase tracking-widest text-foreground outline-none focus:border-accent"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="AB3K9"
            maxLength={8}
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={joinRoom}
          className="w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-50"
        >
          コードで入室
        </button>

        {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
      </div>
    </main>
    </>
  );
}
