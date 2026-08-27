"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCard, PILLAR_LABEL } from "@/lib/deck";
import {
  closeRoom,
  ensureResultPhase,
  formatResultsText,
  revertSelection,
  saveStatement,
  submitReason,
  submitSelection,
} from "@/lib/game-actions";
import { createBrowserClient } from "@/lib/supabase/client";
import { downloadResultPoster, getPosterPreviewClasses } from "@/lib/result-poster";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { isSeatedPlayer, seatedPlayers, type Player, type Room } from "@/lib/types";

type Props = {
  room: Room;
  players: Player[];
  me: Player;
  onChanged: () => Promise<void>;
  /** 通信なし見本。操作は部屋に反映しない */
  demo?: boolean;
};

const STATEMENT_COOLDOWN_MS = 5000;

export function EndgameView({ room, players, me, onChanged, demo = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoHint, setDemoHint] = useState<string | null>(null);
  const [mainId, setMainId] = useState<string | null>(me.main_card_id);
  const [subIds, setSubIds] = useState<string[]>(me.sub_card_ids ?? []);
  const [reason, setReason] = useState(me.reason ?? "");
  const [statement, setStatement] = useState(me.statement ?? "");
  const [copied, setCopied] = useState(false);
  const [savingPosterId, setSavingPosterId] = useState<string | null>(null);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    setStatement(me.statement ?? "");
  }, [me.statement]);

  // sub_card_ids は毎 refresh で新しい配列参照になるため、中身のキーで同期する。
  // 参照を依存にすると他者が確定しただけで自分の未送信ドラフトが消える。
  const serverSubKey = (me.sub_card_ids ?? []).join("\0");
  useEffect(() => {
    setMainId(me.main_card_id);
    setSubIds(me.sub_card_ids ?? []);
    setReason(me.reason ?? "");
  }, [me.id, me.main_card_id, serverSubKey, me.reason, me.ready_selecting]);

  const spectating = !isSeatedPlayer(me);

  // 全員完了なのに RESULT に進んでいない部屋を回収（同時送信の取りこぼし）
  const allEndgameDone = useMemo(() => {
    const seated = seatedPlayers(players);
    return (
      seated.length > 0 && seated.every((p) => p.ready_selecting && p.ready_writing)
    );
  }, [players]);
  const advancingRef = useRef(false);
  useEffect(() => {
    if (demo) return;
    if (room.phase !== "SELECTING" && room.phase !== "WRITING") {
      advancingRef.current = false;
      return;
    }
    if (!allEndgameDone || advancingRef.current) return;
    advancingRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createBrowserClient();
        await ensureResultPhase({ supabase, roomCode: room.code });
        if (!cancelled) await onChanged();
      } catch {
        if (!cancelled) advancingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demo, allEndgameDone, room.phase, room.code, onChanged]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const generating = generatingForId !== null;

  function canGenerateFor(p: Player) {
    const ownReason = p.id === me.id ? me.reason ?? reason : p.reason;
    return Boolean((ownReason ?? "").trim()) && !generating && cooldownLeft <= 0;
  }

  const mainCard = me.main_card_id ? getCard(me.main_card_id) : null;
  const posterPreview = getPosterPreviewClasses(mainCard?.pillar);

  const sorted = useMemo(
    () =>
      seatedPlayers(players).sort((a, b) => {
        const ai = a.seat_index ?? 999;
        const bi = b.seat_index ?? 999;
        return ai - bi;
      }),
    [players],
  );

  async function run(action: () => Promise<void>) {
    if (demo) {
      setDemoHint("見本です。部屋には反映しません。");
      return;
    }
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

  async function generateStatementFor(target: Player) {
    if (demo) {
      setDemoHint("見本です。生成AIの API は呼びません。");
      return;
    }
    if (!canGenerateFor(target)) return;
    const targetReason =
      target.id === me.id ? (me.reason ?? reason).trim() : (target.reason ?? "").trim();
    if (!targetReason) {
      setError("理由がないため生成できません");
      return;
    }
    setGeneratingForId(target.id);
    setError(null);
    try {
      const res = await fetch("/api/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainCardId: target.main_card_id,
          subCardIds: target.sub_card_ids ?? [],
          handCardIds: target.hand ?? [],
          reason: targetReason,
        }),
      });
      const data = (await res.json()) as { statement?: string; error?: string };
      if (!res.ok || !data.statement) {
        throw new Error(data.error || "生成に失敗しました");
      }
      if (target.id === me.id) setStatement(data.statement);
      const supabase = createBrowserClient();
      await saveStatement({
        supabase,
        actorId: target.id,
        statement: data.statement,
      });
      await onChanged();
      setCooldownUntil(Date.now() + STATEMENT_COOLDOWN_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setGeneratingForId(null);
    }
  }

  if (room.phase === "SELECTING" || room.phase === "WRITING") {
    const stillSelecting = sorted.filter((p) => !p.ready_selecting).length;
    const stillWriting = sorted.filter(
      (p) => p.ready_selecting && !p.ready_writing,
    ).length;

    if (spectating) {
      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-mint">進行役</h2>
            <p className="text-sm text-muted">
              席には座っていません。参加者の選定と理由が揃うと結果へ進みます。
            </p>
            <ul className="space-y-2">
              {sorted.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{p.display_name}</span>
                  <span className="text-xs text-muted">
                    {!p.ready_selecting
                      ? "選定中"
                      : !p.ready_writing
                        ? "理由を記入中"
                        : "完了"}
                  </span>
                </li>
              ))}
            </ul>
            {stillSelecting === 0 && stillWriting === 0 && (
              <p className="text-sm text-mint">全員の入力が揃うと結果へ進みます…</p>
            )}
          </section>
          {demoHint && <p className="text-sm text-mint">{demoHint}</p>}
          {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
        </div>
      );
    }

    if (!me.ready_selecting) {
      const mainLabel = mainId ? getCard(mainId)?.label : null;
      const selectStep: "main" | "sub" = mainId ? "sub" : "main";

      function onSelectCard(id: string) {
        if (busy) return;
        if (selectStep === "main") {
          setMainId((prev) => (prev === id ? null : id));
          setSubIds([]);
          return;
        }
        // サブ段階: メイン札をもう一度タップしたら解除してメイン選択に戻る
        if (id === mainId) {
          setMainId(null);
          setSubIds([]);
          return;
        }
        setSubIds((prev) => {
          if (prev.includes(id)) return prev.filter((x) => x !== id);
          if (prev.length >= 2) return [prev[1], id];
          return [...prev, id];
        });
      }

      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-accent">価値観を選ぶ</h2>
            <p className="text-sm text-muted">
              {selectStep === "main"
                ? "まず、いちばん大切にしたい価値観を1枚タップしてください。"
                : `次に、サブを2枚タップしてください。（メイン: ${mainLabel}）`}
            </p>
            {stillSelecting > 1 && (
              <p className="text-xs text-muted">
                ほか {stillSelecting - 1} 人がまだ選定中
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {me.hand.map((id) => {
                const card = getCard(id);
                const isMain = mainId === id;
                const isSub = subIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSelectCard(id)}
                    className={`min-w-[96px] rounded-xl border px-3 py-3 text-center transition ${
                      isMain
                        ? "border-accent bg-accent/10"
                        : isSub
                          ? "border-mint bg-mint/10"
                          : "border-line bg-background hover:border-white/30"
                    }`}
                  >
                    {(isMain || isSub) && (
                      <span
                        className={`mb-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          isMain
                            ? "bg-accent/20 text-accent"
                            : "bg-mint/20 text-mint"
                        }`}
                      >
                        {isMain ? "メイン" : "サブ"}
                      </span>
                    )}
                    <div className="font-bold">{card?.label}</div>
                    <div className="mt-1 text-[10px] text-muted">
                      {card ? PILLAR_LABEL[card.pillar] : ""}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              メイン: {mainLabel ?? "未選択"} ／ サブ:{" "}
              {subIds.map((id) => getCard(id)?.label).join("、") || "未選択"}
            </p>
            {selectStep === "sub" && (
              <button
                type="button"
                disabled={busy}
                className="text-sm text-mint underline"
                onClick={() => {
                  setMainId(null);
                  setSubIds([]);
                }}
              >
                メインから選びなおす
              </button>
            )}
            <button
              type="button"
              disabled={busy || !mainId || subIds.length !== 2}
              className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
              onClick={() =>
                void run(async () => {
                  if (!mainId || subIds.length !== 2) return;
                  const supabase = createBrowserClient();
                  await submitSelection({
                    supabase,
                    room,
                    players,
                    actorId: me.id,
                    mainCardId: mainId,
                    subCardIds: [subIds[0], subIds[1]],
                  });
                })
              }
            >
              この3枚で確定する
            </button>
          </section>
          {demoHint && <p className="text-sm text-mint">{demoHint}</p>}
          {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
        </div>
      );
    }

    if (!me.ready_writing) {
      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-accent">理由を書く</h2>
            <p className="text-sm text-muted">
              メイン {getCard(me.main_card_id ?? "")?.label} ／ サブ{" "}
              {(me.sub_card_ids ?? []).map((id) => getCard(id)?.label).join("、")}
            </p>
            {stillSelecting > 0 && (
              <p className="text-xs text-muted">ほか {stillSelecting} 人がまだ選定中</p>
            )}
            {stillSelecting === 0 && stillWriting > 1 && (
              <p className="text-xs text-muted">
                理由の入力待ち {stillWriting - 1} 人
              </p>
            )}
            <textarea
              className="min-h-28 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="なぜこの価値観を選んだか（200文字まで）"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">{reason.length} / 200</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-line px-3 py-2 text-sm"
                  onClick={() =>
                    void run(async () => {
                      const supabase = createBrowserClient();
                      await revertSelection({
                        supabase,
                        room,
                        players,
                        actorId: me.id,
                      });
                    })
                  }
                >
                  選定に戻る
                </button>
                <button
                  type="button"
                  disabled={busy || !reason.trim()}
                  className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
                  onClick={() =>
                    void run(async () => {
                      const supabase = createBrowserClient();
                      await submitReason({
                        supabase,
                        room,
                        players,
                        actorId: me.id,
                        reason,
                      });
                    })
                  }
                >
                  理由を送る
                </button>
              </div>
            </div>
          </section>
          {demoHint && <p className="text-sm text-mint">{demoHint}</p>}
          {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-mint">送信済み</h2>
          <p className="text-sm text-muted">
            メイン {getCard(me.main_card_id ?? "")?.label} ／ サブ{" "}
            {(me.sub_card_ids ?? []).map((id) => getCard(id)?.label).join("、")}
          </p>
          {stillSelecting > 0 ? (
            <p className="text-sm text-mint">
              ほか {stillSelecting} 人がまだ選定中…
            </p>
          ) : stillWriting > 0 ? (
            <p className="text-sm text-mint">
              理由の入力待ち {stillWriting} 人…
            </p>
          ) : (
            <p className="text-sm text-mint">全員の入力が揃うと結果へ進みます…</p>
          )}
        </section>
        {demoHint && <p className="text-sm text-mint">{demoHint}</p>}
        {error && <p className="text-sm text-[#f0a0a0]">{error}</p>}
      </div>
    );
  }

  if (room.phase === "RESULT" || room.phase === "CLOSED") {
    return (
      <div className="space-y-4">
        <InAppBrowserBanner variant="result" />
        <section className="rounded-2xl border border-line bg-panel p-4 space-y-4 shadow-[0_10px_30px_rgba(22,56,47,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-mint">結果</h2>
              <p className="mt-1 text-xs text-muted">
                {spectating
                  ? "進行役として全員の結果を見ています。ステートメントの生成とポスター保存ができます。"
                  : "終わったらこのタブを閉じて大丈夫です。同じブラウザなら、部屋リンクをもう一度開けば席に戻れます（別の端末・シークレットでは別人扱いになります）。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-line px-3 py-2 text-sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(formatResultsText(sorted));
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setError("コピーに失敗しました");
                  }
                }}
              >
                {copied ? "コピーしました" : "全員分をテキストコピー"}
              </button>
              {me.is_host ? (
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-3 py-2 text-sm font-bold text-[#12122a]"
                  onClick={() => {
                    const path = demo
                      ? "/report-preview"
                      : `/admin/reports?room=${encodeURIComponent(room.code)}`;
                    window.open(
                      path,
                      "vd-team-report",
                      "width=780,height=960,scrollbars=yes,resizable=yes",
                    );
                  }}
                >
                  チームレポートを作る
                </button>
              ) : null}
            </div>
          </div>

          {!spectating && (
          <div
            className={`overflow-hidden rounded-2xl border p-5 backdrop-blur-md ${posterPreview.card}`}
          >
            <p className={`text-xs font-semibold tracking-wide ${posterPreview.title}`}>
              わたしの価値観
              {mainCard ? ` · ${PILLAR_LABEL[mainCard.pillar]}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">{me.display_name}</p>
            <p className={`mt-4 text-4xl font-bold ${posterPreview.main}`}>
              {mainCard?.label ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(me.sub_card_ids ?? []).map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-[#f4f7ff] shadow-sm"
                >
                  {getCard(id)?.label}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className={`text-xs font-semibold ${posterPreview.title}`}>
                  わたしの言葉
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#e8ecff]/80">
                  {me.reason || "（理由なし）"}
                </p>
              </div>
              {statement ? (
                <div>
                  <p className={`text-xs font-semibold ${posterPreview.title}`}>
                    価値観ステートメント
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#e8ecff]">
                    {statement}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  任意: AIが宣言文に整えます。作らなくても画像保存できます。
                </p>
              )}
              <button
                type="button"
                disabled={!canGenerateFor(me)}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold disabled:opacity-40"
                onClick={() => void generateStatementFor(me)}
              >
                {generatingForId === me.id
                  ? "生成中…"
                  : cooldownLeft > 0
                    ? `再生成まで ${cooldownLeft}s`
                    : statement
                      ? "ステートメントを作り直す"
                      : "ステートメントを整える"}
              </button>
            </div>

            <button
              type="button"
              disabled={savingPosterId === me.id}
              className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50 ${posterPreview.button}`}
              onClick={() =>
                void (async () => {
                  setSavingPosterId(me.id);
                  setError(null);
                  try {
                    await downloadResultPoster({
                      displayName: me.display_name,
                      mainCardId: me.main_card_id,
                      subCardIds: me.sub_card_ids ?? [],
                      reason: me.reason,
                      statement: statement || me.statement,
                      handCardIds: me.hand ?? [],
                    });
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "画像保存に失敗しました",
                    );
                  } finally {
                    setSavingPosterId(null);
                  }
                })()
              }
            >
              {savingPosterId === me.id
                ? "作成中…"
                : "自分の結果を画像で保存"}
            </button>
          </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((p) => (
              <article
                key={p.id}
                className="rounded-xl border border-line bg-background p-3 space-y-2"
              >
                <h3 className="font-semibold">
                  {p.display_name}
                  {p.id === me.id ? "（あなた）" : ""}
                </h3>
                <p className="text-xs text-muted">
                  最終5枚:{" "}
                  {(p.hand ?? [])
                    .map((id) => getCard(id)?.label ?? id)
                    .join("、") || "—"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    メイン: {getCard(p.main_card_id ?? "")?.label ?? "—"}
                  </span>
                  {(p.sub_card_ids ?? []).map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-mint/15 px-2 py-0.5 text-xs font-semibold text-mint"
                    >
                      サブ: {getCard(id)?.label ?? id}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {p.reason || "（理由なし）"}
                </p>
                {p.statement ? (
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {p.statement}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  {me.is_host && p.id !== me.id ? (
                    <button
                      type="button"
                      disabled={!canGenerateFor(p)}
                      className="text-xs font-semibold text-accent underline disabled:opacity-40"
                      onClick={() => void generateStatementFor(p)}
                    >
                      {generatingForId === p.id
                        ? "生成中…"
                        : cooldownLeft > 0
                          ? `再生成まで ${cooldownLeft}s`
                          : p.statement
                            ? "この人のステートメントを作り直す"
                            : "この人のステートメントを整える"}
                    </button>
                  ) : null}
                  {me.is_host && p.id !== me.id ? (
                    <button
                      type="button"
                      disabled={savingPosterId === p.id}
                      className="text-xs font-semibold text-mint underline disabled:opacity-50"
                      onClick={() =>
                        void (async () => {
                          setSavingPosterId(p.id);
                          setError(null);
                          try {
                            await downloadResultPoster({
                              displayName: p.display_name,
                              mainCardId: p.main_card_id,
                              subCardIds: p.sub_card_ids ?? [],
                              reason: p.reason,
                              statement: p.statement,
                              handCardIds: p.hand ?? [],
                            });
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "画像保存に失敗しました",
                            );
                          } finally {
                            setSavingPosterId(null);
                          }
                        })()
                      }
                    >
                      {savingPosterId === p.id ? "作成中…" : "この人の分を画像保存"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {me.is_host && room.phase === "RESULT" && (
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-line px-3 py-2 text-sm text-muted"
              onClick={() =>
                void run(async () => {
                  const supabase = createBrowserClient();
                  await closeRoom({ supabase, room, actorId: me.id });
                })
              }
            >
              部屋を閉じる
            </button>
          )}
          {room.phase === "CLOSED" && (
            <p className="text-sm text-muted">この部屋は閉じられました。</p>
          )}
        </section>
        {error && <p className="text-sm text-[#d64545]">{error}</p>}
      </div>
    );
  }

  return null;
}
