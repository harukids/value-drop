"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateRoomCode } from "@/lib/room-code";
import { isSupabaseConfigured, createBrowserClient } from "@/lib/supabase/client";
import { savePlayerId } from "@/lib/player-storage";
import { HomeEntryBg } from "@/components/HomeEntryBg";
import { LineArtCoverBg } from "@/components/LineArtCoverBg";

const SECRET_KEY = "vd-host-secret";

export default function HostPage() {
  const router = useRouter();
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(SECRET_KEY) ?? "";
  });
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function verifySecret(value: string) {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: value }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "合言葉が違います");
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_KEY);
    if (!stored) return;
    let cancelled = false;
    void (async () => {
      try {
        await verifySecret(stored);
        if (!cancelled) setAuthed(true);
      } catch {
        sessionStorage.removeItem(SECRET_KEY);
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function unlock() {
    setError(null);
    setBusy(true);
    try {
      await verifySecret(secret);
      sessionStorage.setItem(SECRET_KEY, secret);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "認証に失敗しました");
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  }

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
            ホスト
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            部屋を作る画面です。合言葉のあとに表示名を入れて開始できます。参加者はトップからコードで入室します。
          </p>
        </header>

        <div className="space-y-4 rounded-2xl border border-line bg-panel p-5">
          {!authed ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-mint">合言葉</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-foreground outline-none focus:border-accent"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="ホスト用の合言葉"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void unlock();
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !secret.trim()}
                onClick={() => void unlock()}
                className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#b794ff] to-[#ff8ec8] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-50"
              >
                解除する
              </button>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-mint">表示名</span>
                <input
                  className="w-full rounded-xl border border-line bg-background px-3 py-2.5 text-foreground outline-none focus:border-accent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: はるき"
                  maxLength={24}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void createRoom();
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !configured}
                onClick={() => void createRoom()}
                className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#b794ff] to-[#ff8ec8] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-50"
              >
                部屋を作る（ホスト）
              </button>
            </>
          )}

          {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
        </div>

        <p className="text-center text-sm text-muted">
          <Link href="/" className="text-mint underline">
            トップ（入室）へ
          </Link>
        </p>
      </main>
    </>
  );
}
