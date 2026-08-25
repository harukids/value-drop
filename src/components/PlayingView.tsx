"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCard, PILLAR_LABEL } from "@/lib/deck";
import {
  confirmSteal,
  discardCard,
  gainCard,
  nextSeatId,
  selectStealCard,
  skipTurn,
} from "@/lib/game-actions";
import {
  SpeakBanner,
  SpeakConfirmSheet,
  speakGainScript,
  speakReleaseScript,
} from "@/components/SpeakThenConfirm";
import { createBrowserClient } from "@/lib/supabase/client";
import { MAX_DENY, type Player, type Room } from "@/lib/types";

type Props = {
  room: Room;
  players: Player[];
  me: Player;
  onChanged: () => Promise<void>;
};

export function PlayingView({ room, players, me, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldQuery, setFieldQuery] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedDiscardId, setSelectedDiscardId] = useState<string | null>(
    null,
  );
  const [confirmKind, setConfirmKind] = useState<"discard" | "gain" | null>(
    null,
  );
  const [bannerFlash, setBannerFlash] = useState(false);
  const prevMyActionRef = useRef(false);

  const byId = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p]));
    return map;
  }, [players]);

  const current = room.current_player_id
    ? byId.get(room.current_player_id)
    : undefined;
  const victimId = room.current_player_id
    ? nextSeatId(room.seat_order, room.current_player_id)
    : null;
  const victim = victimId ? byId.get(victimId) : undefined;

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const ai = room.seat_order.indexOf(a.id);
      const bi = room.seat_order.indexOf(b.id);
      return ai - bi;
    });
  }, [players, room.seat_order]);

  const fieldCards = useMemo(() => {
    const q = fieldQuery.trim();
    return room.field
      .map((id) => getCard(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .filter((c) => !q || c.label.includes(q));
  }, [room.field, fieldQuery]);

  const canStealSelect =
    room.sub_state === "STEAL_SELECT" && room.current_player_id === me.id;
  const canStealConfirm =
    room.sub_state === "STEAL_CONFIRM" && victimId === me.id;
  const canDiscardNow =
    room.sub_state === "DISCARD" && room.current_player_id === me.id;
  const canGainNow = room.sub_state === "GAIN" && victimId === me.id;
  const isMyAction =
    canStealSelect || canStealConfirm || canDiscardNow || canGainNow;

  /** いま操作すべき人（STEAL_CONFIRM / GAIN は隣側） */
  const actingId =
    room.sub_state === "STEAL_CONFIRM" || room.sub_state === "GAIN"
      ? victimId
      : room.current_player_id;

  const myActionLabel =
    room.sub_state === "STEAL_SELECT"
      ? "隣から1枚選ぶ"
      : room.sub_state === "STEAL_CONFIRM"
        ? "OK / ダメ を選ぶ"
        : room.sub_state === "DISCARD"
          ? "1枚捨てる"
          : room.sub_state === "GAIN"
            ? "場から1枚得る"
            : "操作する";

  const waitLabel =
    room.sub_state === "STEAL_SELECT"
      ? `${current?.display_name ?? "手番者"}が隣から1枚選ぶ`
      : room.sub_state === "STEAL_CONFIRM"
        ? `${victim?.display_name ?? "隣"}が OK / ダメ を選ぶ`
        : room.sub_state === "DISCARD"
          ? `${current?.display_name ?? "手番者"}が1枚捨てる`
          : room.sub_state === "GAIN"
            ? `${victim?.display_name ?? "隣"}が場から1枚得る`
            : room.sub_state;

  useEffect(() => {
    if (isMyAction && !prevMyActionRef.current) {
      setBannerFlash(true);
      const id = window.setTimeout(() => setBannerFlash(false), 1200);
      prevMyActionRef.current = true;
      return () => window.clearTimeout(id);
    }
    if (!isMyAction) prevMyActionRef.current = false;
  }, [isMyAction]);

  const discardLabel = selectedDiscardId
    ? (getCard(selectedDiscardId)?.label ?? selectedDiscardId)
    : null;
  const gainLabel = selectedFieldId
    ? (getCard(selectedFieldId)?.label ?? selectedFieldId)
    : null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const frameMine = "turn-frame-mine";
  const frameWait = "turn-frame-wait";

  return (
    <div className="space-y-4">
      <div
        className={`sticky top-0 z-20 -mx-1 rounded-2xl px-4 py-3 backdrop-blur-md ${
          isMyAction
            ? "turn-frame-mine bg-[rgba(42,24,48,0.92)]"
            : "turn-frame-wait bg-[rgba(18,36,40,0.92)]"
        } ${bannerFlash ? "turn-banner-flash" : ""}`}
        role="status"
        aria-live="polite"
      >
        {isMyAction ? (
          <p className="text-base font-bold text-accent">
            あなたの番：{myActionLabel}
          </p>
        ) : (
          <p className="text-base font-bold text-mint">待機：{waitLabel}</p>
        )}
        <p className="mt-0.5 text-xs text-muted">
          {isMyAction
            ? "下のピンク縁のエリアを操作してください"
            : "ミント縁は待機中です。自分の番になるとピンクに変わります"}
        </p>
      </div>

      <section
        className={`rounded-2xl bg-panel p-4 space-y-3 ${
          isMyAction ? frameMine : frameWait
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className={`text-xs font-semibold ${
                isMyAction ? "text-accent" : "text-mint"
              }`}
            >
              プレイ中
            </p>
            <p className="mt-1 text-sm text-muted">
              ターン進行: 各人{" "}
              {sorted
                .map((p) => `${p.display_name}${p.turns_completed}`)
                .join(" / ")}{" "}
              /5
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              いま: {waitLabel}
            </p>
            <p className="mt-1 text-xs text-muted">
              ダメ使用: {room.deny_count} / {MAX_DENY}
            </p>
          </div>
          {me.is_host && (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-line px-3 py-2 text-sm text-[#f0a0a0]"
              onClick={() =>
                void run(async () => {
                  const supabase = createBrowserClient();
                  await skipTurn({
                    supabase,
                    room,
                    players,
                    actorId: me.id,
                  });
                })
              }
            >
              手番スキップ
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {sorted.map((p) => {
            const isActing = p.id === actingId;
            const isMeActing = isActing && p.id === me.id;
            return (
              <span
                key={p.id}
                className={`rounded-full px-3 py-1 text-xs ${
                  isMeActing
                    ? "bg-accent font-semibold text-[#1c2421]"
                    : isActing
                      ? "border border-mint bg-mint/15 font-semibold text-mint"
                      : "border border-line bg-background"
                }`}
              >
                {p.display_name}
                {p.id === me.id ? "（あなた）" : ""} · 手札{p.hand.length}
                {isActing ? " · 操作中" : ""}
              </span>
            );
          })}
        </div>
      </section>

      {room.sub_state === "STEAL_CONFIRM" && victim && (
        <section
          className={`space-y-4 rounded-2xl bg-panel p-4 ${
            canStealConfirm ? frameMine : frameWait
          }`}
        >
          <div>
            <h2
              className={`text-sm font-semibold ${
                canStealConfirm ? "text-accent" : "text-mint"
              }`}
            >
              {victimId === me.id
                ? "あなたの手札が選ばれています"
                : `${victim.display_name} の手札が選ばれています`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {current?.display_name}{" "}
              が選んだ札は、点滅・縁取りされているカードです。
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 rounded-xl bg-background/60 p-4">
            {victim.hand.map((id, index) => {
              const card = getCard(id);
              const isPending = room.pending_card_id === id;
              const denied = (room.denied_card_ids ?? []).includes(id);
              const reveal = victimId === me.id;
              return (
                <div
                  key={`confirm-${id}-${index}`}
                  className={`relative flex h-[100px] w-[76px] flex-col items-center justify-center rounded-xl border-2 text-center ${
                    isPending
                      ? "card-targeted border-accent bg-[#2a1f3d]"
                      : denied
                        ? "border-line bg-[#151a2e] opacity-40"
                        : "border-line bg-[#1a2038]"
                  }`}
                >
                  {isPending && (
                    <span className="card-targeted-label absolute -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-[#1a1230]">
                      これ
                    </span>
                  )}
                  {reveal ? (
                    <>
                      <span
                        className={`text-base font-bold ${isPending ? "text-accent" : ""}`}
                      >
                        {card?.label ?? "?"}
                      </span>
                      <span className="mt-1 text-[10px] text-muted">
                        {card ? PILLAR_LABEL[card.pillar] : ""}
                      </span>
                    </>
                  ) : (
                    <span
                      className={`text-lg ${isPending ? "text-accent" : "text-muted"}`}
                    >
                      {denied ? "×" : "?"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {canStealConfirm ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-mint px-4 py-2 text-sm font-bold text-white"
                onClick={() =>
                  void run(async () => {
                    const supabase = createBrowserClient();
                    await confirmSteal({
                      supabase,
                      room,
                      players,
                      actorId: me.id,
                      accept: true,
                    });
                  })
                }
              >
                OK（渡す）
              </button>
              <button
                type="button"
                disabled={busy || room.deny_count >= MAX_DENY}
                className="rounded-xl border border-line px-4 py-2 text-sm disabled:opacity-40"
                onClick={() =>
                  void run(async () => {
                    const supabase = createBrowserClient();
                    await confirmSteal({
                      supabase,
                      room,
                      players,
                      actorId: me.id,
                      accept: false,
                    });
                  })
                }
              >
                ダメ（残り {Math.max(0, MAX_DENY - room.deny_count)} 回）
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted">
              {victim.display_name} が OK / ダメ を選ぶまで待ってください
            </p>
          )}
        </section>
      )}

      <section
        className={`space-y-3 rounded-2xl bg-panel p-4 ${
          canDiscardNow || canStealConfirm ? frameMine : "border border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className={`text-sm font-semibold ${
              canDiscardNow || canStealConfirm ? "text-accent" : "text-muted"
            }`}
          >
            あなたの手札
          </h2>
          {canDiscardNow && (
            <span className="card-targeted-label rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
              ここで1枚選んで捨てる
            </span>
          )}
        </div>

        {canDiscardNow && (
          <SpeakBanner
            script={
              discardLabel
                ? speakReleaseScript(discardLabel)
                : "私は「〇〇」を手放します"
            }
          />
        )}

        <div className="flex flex-wrap gap-2">
          {me.hand.map((id) => {
            const card = getCard(id);
            const isSelected = canDiscardNow && selectedDiscardId === id;
            const isTargeted =
              room.sub_state === "STEAL_CONFIRM" &&
              victimId === me.id &&
              room.pending_card_id === id;
            return (
              <button
                key={id}
                type="button"
                disabled={busy || !canDiscardNow}
                onClick={() => {
                  if (!canDiscardNow) return;
                  setSelectedDiscardId(id);
                  setConfirmKind(null);
                }}
                className={`relative min-w-[88px] rounded-xl border bg-[#1a2038]/90 px-3 py-4 text-center shadow-sm disabled:opacity-60 ${
                  isSelected || isTargeted
                    ? "card-targeted border-accent"
                    : "border-line"
                }`}
              >
                {isTargeted && (
                  <span className="card-targeted-label absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-[#1a1230]">
                    選択中
                  </span>
                )}
                <div
                  className={`font-bold ${
                    isSelected || isTargeted ? "text-accent" : ""
                  }`}
                >
                  {card?.label ?? id}
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  {card ? PILLAR_LABEL[card.pillar] : ""}
                </div>
              </button>
            );
          })}
        </div>

        {canDiscardNow && (
          <button
            type="button"
            disabled={busy || !selectedDiscardId}
            className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            onClick={() => setConfirmKind("discard")}
          >
            このカードを手放す…
          </button>
        )}
        {canStealConfirm && (
          <p className="text-xs text-accent">
            点滅しているカードが、相手に選ばれています。
          </p>
        )}
      </section>

      {canStealSelect && victim && (
        <section
          className={`space-y-3 rounded-2xl bg-panel p-4 ${frameMine}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-accent">
              {victim.display_name} の手札（裏）から1枚選ぶ
            </h2>
            <span className="card-targeted-label rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
              ここで選ぶ
            </span>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-accent/30 bg-[#14182e]/70 p-3">
            {victim.hand.map((id, index) => {
              const denied = (room.denied_card_ids ?? []).includes(id);
              return (
                <button
                  key={`${id}-${index}`}
                  type="button"
                  disabled={busy || denied}
                  title={
                    denied ? "この手番ですでにダメされたカード" : undefined
                  }
                  onClick={() =>
                    void run(async () => {
                      const supabase = createBrowserClient();
                      await selectStealCard({
                        supabase,
                        room,
                        players,
                        actorId: me.id,
                        cardId: id,
                      });
                    })
                  }
                  className={`h-[72px] w-[56px] rounded-lg border text-xs transition ${
                    denied
                      ? "cursor-not-allowed border-line bg-[#1a1f33] text-[#6b7390] opacity-50"
                      : "border-[#b794ff]/50 bg-gradient-to-b from-[#2a2550] to-[#1c2240] text-[#c9d7ff] hover:border-[#ff9ad5] hover:from-[#3a2a60]"
                  }`}
                >
                  {denied ? "×" : "?"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            中身は見えません。「ダメ」された札は ×
            になり、同じ手番では再選択できません。
          </p>
        </section>
      )}

      <section
        className={`space-y-3 rounded-2xl bg-panel p-4 ${
          canGainNow ? frameMine : "border border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            className={`text-sm font-semibold ${
              canGainNow ? "text-accent" : "text-muted"
            }`}
          >
            場のカード（{room.field.length}枚）
          </h2>
          {canGainNow && (
            <span className="card-targeted-label rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
              ここで1枚選んで得る
            </span>
          )}
        </div>

        {canGainNow && (
          <SpeakBanner
            script={
              gainLabel
                ? speakGainScript(gainLabel)
                : "私は「〇〇」を手に入れます"
            }
          />
        )}

        <input
          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="検索（例: 自由）"
          value={fieldQuery}
          onChange={(e) => setFieldQuery(e.target.value)}
        />
        <div
          className={`grid max-h-56 grid-cols-3 gap-2 overflow-auto rounded-xl p-2 sm:grid-cols-4 ${
            canGainNow ? "border border-accent/40 bg-[#14182e]/70" : ""
          }`}
        >
          {fieldCards.map((card) => {
            const selected = selectedFieldId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                disabled={busy || !canGainNow}
                onClick={() => {
                  setSelectedFieldId(card.id);
                  setConfirmKind(null);
                }}
                className={`rounded-xl border px-2 py-3 text-sm font-semibold disabled:opacity-50 ${
                  selected
                    ? "card-targeted border-accent text-accent"
                    : canGainNow
                      ? "border-[#b794ff]/40 bg-[#1a2038] hover:border-accent"
                      : "border-line bg-[#1a2038]/80"
                }`}
              >
                {card.label}
              </button>
            );
          })}
        </div>
        {canGainNow && (
          <button
            type="button"
            disabled={busy || !selectedFieldId}
            className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            onClick={() => setConfirmKind("gain")}
          >
            このカードを得る…
          </button>
        )}
      </section>

      {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}

      {confirmKind === "discard" && discardLabel && selectedDiscardId && (
        <SpeakConfirmSheet
          script={speakReleaseScript(discardLabel)}
          actionLabel="手放す（確定）"
          busy={busy}
          onCancel={() => setConfirmKind(null)}
          onConfirm={() =>
            void run(async () => {
              const supabase = createBrowserClient();
              await discardCard({
                supabase,
                room,
                players,
                actorId: me.id,
                cardId: selectedDiscardId,
              });
              setSelectedDiscardId(null);
              setConfirmKind(null);
            })
          }
        />
      )}

      {confirmKind === "gain" && gainLabel && selectedFieldId && (
        <SpeakConfirmSheet
          script={speakGainScript(gainLabel)}
          actionLabel="得る（確定）"
          busy={busy}
          onCancel={() => setConfirmKind(null)}
          onConfirm={() =>
            void run(async () => {
              const supabase = createBrowserClient();
              await gainCard({
                supabase,
                room,
                players,
                actorId: me.id,
                cardId: selectedFieldId,
              });
              setSelectedFieldId(null);
              setConfirmKind(null);
            })
          }
        />
      )}
    </div>
  );
}
