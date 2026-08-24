"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearPlayerId, loadPlayerId } from "@/lib/player-storage";
import { joinRoomAsGuest } from "@/lib/join-room";
import { startAndDeal } from "@/lib/game-actions";
import { DECK } from "@/lib/deck";
import { PlayingView } from "@/components/PlayingView";
import { EndgameView } from "@/components/EndgameView";
import { LineArtCoverBg } from "@/components/LineArtCoverBg";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RECOMMENDED_MAX,
  type Player,
  type Room,
} from "@/lib/types";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [loaded, setLoaded] = useState(false);
  const joiningRef = useRef(false);

  async function copyText(kind: "link" | "code", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("コピーに失敗しました。手動で選択してコピーしてください。");
    }
  }

  const me = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId],
  );

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) return [] as Player[];
    const supabase = createBrowserClient();
    const [{ data: roomData, error: roomError }, { data: playerData, error: playerError }] =
      await Promise.all([
        supabase.from("rooms").select("*").eq("code", code).maybeSingle(),
        supabase
          .from("players")
          .select("*")
          .eq("room_code", code)
          .order("created_at", { ascending: true }),
      ]);
    if (roomError) throw roomError;
    if (playerError) throw playerError;

    const nextPlayers = (playerData as Player[]) ?? [];
    setRoom(roomData as Room | null);
    setPlayers(nextPlayers);
    setLoaded(true);
    return nextPlayers;
  }, [code]);

  useEffect(() => {
    setLoaded(false);
    setPlayers([]);
    setRoom(null);
    setPlayerId(loadPlayerId(code));
  }, [code]);

  // 名簿と照合。入室中は消さない。名簿にいない古い ID だけクリア
  useEffect(() => {
    if (!loaded || joiningRef.current) return;
    const stored = loadPlayerId(code);
    if (stored && players.some((p) => p.id === stored)) {
      setPlayerId(stored);
      return;
    }
    if (stored && !players.some((p) => p.id === stored)) {
      clearPlayerId(code);
      setPlayerId(null);
    }
  }, [loaded, code, players]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError("Supabase が未設定です");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "読み込みに失敗しました");
          setLoaded(true);
        }
      }
    })();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_code=eq.${code}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [code, refresh]);

  async function joinFromInvite() {
    if (!room || room.phase !== "LOBBY" || busy) return;
    setBusy(true);
    joiningRef.current = true;
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { playerId: id, displayName } = await joinRoomAsGuest(
        supabase,
        code,
        joinName,
      );
      const optimistic: Player = {
        id,
        room_code: code,
        display_name: displayName,
        seat_index: players.length,
        hand: [],
        turns_completed: 0,
        main_card_id: null,
        sub_card_ids: [],
        reason: null,
        ready_selecting: false,
        ready_writing: false,
        is_host: false,
      };
      setPlayerId(id);
      setPlayers((prev) =>
        prev.some((p) => p.id === id) ? prev : [...prev, optimistic],
      );

      const next = await refresh();
      if (!next.some((p) => p.id === id)) {
        setPlayers((prev) =>
          prev.some((p) => p.id === id) ? prev : [...prev, optimistic],
        );
      }
      setPlayerId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "入室できませんでした");
    } finally {
      joiningRef.current = false;
      setBusy(false);
    }
  }

  async function moveSeat(fromIndex: number, direction: -1 | 1) {
    if (!me?.is_host || !room || room.phase !== "LOBBY") return;
    const ordered = [...players].sort((a, b) => {
      const ai = a.seat_index ?? 999;
      const bi = b.seat_index ?? 999;
      if (ai !== bi) return ai - bi;
      return a.created_at!.localeCompare(b.created_at!);
    });
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= ordered.length) return;
    const next = [...ordered];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const seatOrder = next.map((p) => p.id);
      await Promise.all(
        next.map((p, i) =>
          supabase.from("players").update({ seat_index: i }).eq("id", p.id),
        ),
      );
      await supabase.from("rooms").update({ seat_order: seatOrder }).eq("code", code);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "並べ替えに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function startGame() {
    if (!me?.is_host || !room) return;
    if (players.length < MIN_PLAYERS) {
      setError(`${MIN_PLAYERS}人以上必要です`);
      return;
    }
    if (players.length > MAX_PLAYERS) {
      setError(`${MAX_PLAYERS}人以下にしてください`);
      return;
    }
    if (players.length > RECOMMENDED_MAX) {
      const ok = window.confirm(
        `${players.length}人です。おすすめは${MIN_PLAYERS}〜${RECOMMENDED_MAX}人です。長くなりますが開始しますか？`,
      );
      if (!ok) return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      // 席順未設定の人を埋める
      const ordered = [...players].sort((a, b) => {
        const ai = a.seat_index ?? 999;
        const bi = b.seat_index ?? 999;
        if (ai !== bi) return ai - bi;
        return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      });
      await startAndDeal(supabase, code, ordered);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "開始に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/room/${code}` : "";

  if (!room && !error) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 items-center justify-center p-8 text-muted">
        読み込み中…
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-8">
        <p className="text-[#f0a0a0]">{error ?? "部屋がありません"}</p>
        <p className="text-sm text-muted">
          URLを確認するか、このタブを閉じてホストに連絡してください。
        </p>
      </main>
    );
  }

  // 招待リンク直開き：まだ参加者でない場合は名前入力
  if (loaded && room.phase === "LOBBY" && !me) {
    if (busy) {
      return (
        <main className="mx-auto flex max-w-lg flex-1 items-center justify-center px-4 py-12 text-muted">
          入室しています…
        </main>
      );
    }

    return (
      <>
        <LineArtCoverBg denser pattern="scatterUltra" />
        <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-12">
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
          <p className="text-xs text-muted">
            部屋 {code} ／ いま {players.length} / {MAX_PLAYERS} 人
          </p>
        </header>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-mint">表示名</span>
          <input
            className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="例: はるき"
            maxLength={24}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void joinFromInvite();
            }}
          />
        </label>

        <button
          type="button"
          disabled={busy || players.length >= MAX_PLAYERS}
          onClick={() => void joinFromInvite()}
          className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
        >
          この部屋に入る
        </button>

        {players.length > 0 && (
          <p className="text-sm text-muted">
            参加中: {players.map((p) => p.display_name).join("、")}
          </p>
        )}

        {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
      </main>
      </>
    );
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const ai = a.seat_index ?? 999;
    const bi = b.seat_index ?? 999;
    if (ai !== bi) return ai - bi;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  return (
    <>
      {room.phase === "LOBBY" && (
        <LineArtCoverBg denser pattern="scatterUltra" />
      )}
      <main className="relative z-[1] mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-mint">部屋 {code}</p>
        <h1 className="text-2xl font-bold">
          {room.phase === "LOBBY"
            ? "ロビー"
            : room.phase === "PLAYING"
              ? "プレイ中"
              : room.phase === "SELECTING" || room.phase === "WRITING"
                ? "選定・理由"
                : room.phase === "RESULT" || room.phase === "CLOSED"
                    ? "結果"
                    : room.phase}
        </h1>
      </header>

      {room.phase === "LOBBY" && (
        <>
          <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-accent">招待</h2>

            <div className="space-y-2">
              <p className="text-xs text-muted">部屋コード</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="rounded-xl bg-background px-3 py-2 text-lg font-bold tracking-[0.2em]">
                  {code}
                </p>
                <button
                  type="button"
                  className="rounded-xl border border-line px-3 py-2 text-sm"
                  onClick={() => void copyText("code", code)}
                >
                  {copied === "code" ? "コピーしました" : "部屋コードをコピー"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted">招待リンク</p>
              <p className="break-all rounded-xl bg-background px-3 py-2 text-sm">{shareUrl}</p>
              <button
                type="button"
                className="rounded-xl border border-line px-3 py-2 text-sm"
                onClick={() => void copyText("link", shareUrl)}
              >
                {copied === "link" ? "コピーしました" : "リンクをコピー"}
              </button>
            </div>

            <p className="text-xs text-muted">
              人数 {players.length} / {MAX_PLAYERS}（開始は{MIN_PLAYERS}人以上、おすすめ
              {MIN_PLAYERS}〜{RECOMMENDED_MAX}）
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-accent">席順（隣＝次の人）</h2>
            <ul className="space-y-2">
              {sortedPlayers.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2"
                >
                  <div>
                    <span className="font-semibold">
                      {i + 1}. {p.display_name}
                    </span>
                    {p.is_host && (
                      <span className="ml-2 text-xs text-mint">ホスト</span>
                    )}
                    {p.id === playerId && (
                      <span className="ml-2 text-xs text-accent">あなた</span>
                    )}
                  </div>
                  {me?.is_host && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy || i === 0}
                        className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30"
                        onClick={() => void moveSeat(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || i === sortedPlayers.length - 1}
                        className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30"
                        onClick={() => void moveSeat(i, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {me?.is_host ? (
            <button
              type="button"
              disabled={busy || players.length < MIN_PLAYERS}
              onClick={() => void startGame()}
              className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            >
              ゲームを開始する
            </button>
          ) : (
            <p className="text-sm text-muted">ホストの開始待ちです。</p>
          )}
        </>
      )}

      {room.phase === "PLAYING" && me && (
        <PlayingView
          room={room}
          players={players}
          me={me}
          onChanged={async () => {
            await refresh();
          }}
        />
      )}

      {room.phase === "PLAYING" && !me && (
        <section className="rounded-2xl border border-accent bg-panel p-5 space-y-3">
          <h2 className="font-semibold text-accent">このブラウザでは参加者として認識できていません</h2>
          <p className="text-sm text-muted leading-relaxed">
            席は入室したブラウザにだけ保存されます。同じブラウザでこの部屋のリンクを開き直せば戻れます。別の端末・シークレット・別ブラウザでは別人扱いになり、開始後は入れません。どうしても端末を変えられない場合は、ホストに相談してください。
          </p>
        </section>
      )}

      {(room.phase === "SELECTING" ||
        room.phase === "WRITING" ||
        room.phase === "RESULT" ||
        room.phase === "CLOSED") &&
        me && (
          <EndgameView
            room={room}
            players={players}
            me={me}
            onChanged={async () => {
              await refresh();
            }}
          />
        )}

      {(room.phase === "SELECTING" ||
        room.phase === "WRITING" ||
        room.phase === "RESULT" ||
        room.phase === "CLOSED") &&
        !me && (
          <section className="rounded-2xl border border-line bg-panel p-5 space-y-2">
            <h2 className="font-semibold text-accent">参加者情報が見つかりません</h2>
            <p className="text-sm text-muted leading-relaxed">
              同じブラウザでこの部屋のリンクを開き直してください。別の端末では席を引き継げません。このタブを閉じても構いません。
            </p>
          </section>
        )}

      {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
    </main>
    </>
  );
}
