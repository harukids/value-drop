"use client";

import { useState } from "react";
import Link from "next/link";
import { DECK, getCard, PILLAR_LABEL } from "@/lib/deck";
import {
  SpeakBanner,
  SpeakConfirmSheet,
  speakGainScript,
  speakReleaseScript,
} from "@/components/SpeakThenConfirm";

type Mode = "discard" | "gain";

const DEMO_HAND = ["heart-02", "work-13", "growth-08", "heart-09", "work-08"];
const DEMO_FIELD = DECK.slice(0, 12).map((c) => c.id);

/**
 * 本番 PlayingView の見た目に寄せた、声出し確認の通し見本。
 * 通信なし・架空の手番状態。
 */
export default function PlaySpeakDemoPage() {
  const [mode, setMode] = useState<Mode>("discard");
  const [selectedDiscardId, setSelectedDiscardId] = useState<string | null>(
    null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<"discard" | "gain" | null>(
    null,
  );
  const [fieldQuery, setFieldQuery] = useState("");
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const discardLabel = selectedDiscardId
    ? (getCard(selectedDiscardId)?.label ?? selectedDiscardId)
    : null;
  const gainLabel = selectedFieldId
    ? (getCard(selectedFieldId)?.label ?? selectedFieldId)
    : null;

  const fieldCards = DEMO_FIELD.map((id) => getCard(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => !fieldQuery.trim() || c.label.includes(fieldQuery.trim()));

  return (
    <main className="relative z-[1] mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-mint">
          見本 · 本番プレイ画面どおり
        </p>
        <h1 className="text-xl font-bold">声出し確認（本番UI）</h1>
        <p className="text-sm text-muted">
          通信なしのデモです。下の切替で「手放す」「場から得る」を再現します。
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              mode === "discard"
                ? "bg-accent text-[#16382f]"
                : "border border-line text-muted"
            }`}
            onClick={() => {
              setMode("discard");
              setConfirmKind(null);
              setDoneMsg(null);
            }}
          >
            手放すフェーズ
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              mode === "gain"
                ? "bg-accent text-[#16382f]"
                : "border border-line text-muted"
            }`}
            onClick={() => {
              setMode("gain");
              setConfirmKind(null);
              setDoneMsg(null);
            }}
          >
            場から得るフェーズ
          </button>
        </div>
      </header>

      {/* 本番と同じステータス帯 */}
      <section className="space-y-3 rounded-2xl border border-line bg-panel p-4">
        <div>
          <p className="text-xs font-semibold text-mint">プレイ中</p>
          <p className="mt-1 text-sm text-muted">
            ターン進行: 各人 はるき2 / ちょむ2 / みお1 /5
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            いま:{" "}
            {mode === "discard"
              ? "はるきが1枚捨てる"
              : "みおが場から1枚得る"}
          </p>
          <p className="mt-1 text-xs text-muted">ダメ使用: 1 / 3</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["はるき（あなた）", "ちょむ", "みお"].map((name, i) => (
            <span
              key={name}
              className={`rounded-full px-3 py-1 text-xs ${
                (mode === "discard" && i === 0) || (mode === "gain" && i === 2)
                  ? "bg-accent font-semibold text-[#1c2421]"
                  : "border border-line bg-background"
              }`}
            >
              {name} · 手札{5 - i}
            </span>
          ))}
        </div>
      </section>

      {/* 手札（手放す） */}
      <section
        className={`space-y-3 rounded-2xl bg-panel p-4 ${
          mode === "discard"
            ? "border-2 border-accent shadow-[0_0_0_1px_rgba(255,143,107,0.35)]"
            : "border border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-accent">あなたの手札</h2>
          {mode === "discard" && (
            <span className="card-targeted-label rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
              ここで1枚選んで捨てる
            </span>
          )}
        </div>

        {mode === "discard" && (
          <SpeakBanner
            script={
              discardLabel
                ? speakReleaseScript(discardLabel)
                : "私は「〇〇」を手放します"
            }
          />
        )}

        <div className="flex flex-wrap gap-2">
          {DEMO_HAND.map((id) => {
            const card = getCard(id);
            const isSelected =
              mode === "discard" && selectedDiscardId === id;
            return (
              <button
                key={id}
                type="button"
                disabled={mode !== "discard"}
                onClick={() => {
                  setSelectedDiscardId(id);
                  setConfirmKind(null);
                  setDoneMsg(null);
                }}
                className={`relative min-w-[88px] rounded-xl border bg-[#1a2038]/90 px-3 py-4 text-center shadow-sm disabled:opacity-60 ${
                  isSelected ? "card-targeted border-accent" : "border-line"
                }`}
              >
                <div
                  className={`font-bold ${isSelected ? "text-accent" : ""}`}
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

        {mode === "discard" && (
          <button
            type="button"
            disabled={!selectedDiscardId}
            className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            onClick={() => setConfirmKind("discard")}
          >
            このカードを手放す…
          </button>
        )}
      </section>

      {/* 場（得る） */}
      <section
        className={`space-y-3 rounded-2xl bg-panel p-4 ${
          mode === "gain"
            ? "border-2 border-accent shadow-[0_0_0_1px_rgba(255,143,107,0.35)]"
            : "border border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-accent">
            場のカード（{DEMO_FIELD.length}枚）
          </h2>
          {mode === "gain" && (
            <span className="card-targeted-label rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-[#16382f]">
              ここで1枚選んで得る
            </span>
          )}
        </div>

        {mode === "gain" && (
          <SpeakBanner
            script={
              gainLabel
                ? speakGainScript(gainLabel)
                : "私は「〇〇」を手に入れます"
            }
          />
        )}

        <input
          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          placeholder="検索（例: 自由）"
          value={fieldQuery}
          disabled={mode !== "gain"}
          onChange={(e) => setFieldQuery(e.target.value)}
        />
        <div
          className={`grid max-h-56 grid-cols-3 gap-2 overflow-auto rounded-xl p-2 sm:grid-cols-4 ${
            mode === "gain" ? "border border-accent/40 bg-[#14182e]/70" : ""
          }`}
        >
          {fieldCards.map((card) => {
            const selected = mode === "gain" && selectedFieldId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                disabled={mode !== "gain"}
                onClick={() => {
                  setSelectedFieldId(card.id);
                  setConfirmKind(null);
                  setDoneMsg(null);
                }}
                className={`rounded-xl border px-2 py-3 text-sm font-semibold disabled:opacity-50 ${
                  selected
                    ? "card-targeted border-accent text-accent"
                    : mode === "gain"
                      ? "border-[#b794ff]/40 bg-[#1a2038] hover:border-accent"
                      : "border-line bg-[#1a2038]/80"
                }`}
              >
                {card.label}
              </button>
            );
          })}
        </div>
        {mode === "gain" && (
          <button
            type="button"
            disabled={!selectedFieldId}
            className="w-full rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-4 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            onClick={() => setConfirmKind("gain")}
          >
            このカードを得る…
          </button>
        )}
      </section>

      {doneMsg && (
        <p className="rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-sm text-mint">
          {doneMsg}
        </p>
      )}

      <p className="text-xs text-muted">
        本番の部屋でも同じUIです。実際の対戦で見る場合はトップから部屋を作成してください。
      </p>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/voice-prompt-sample" className="text-mint underline">
          簡易見本
        </Link>
        <Link href="/" className="text-mint underline">
          トップへ
        </Link>
      </div>

      {confirmKind === "discard" && discardLabel && selectedDiscardId && (
        <SpeakConfirmSheet
          script={speakReleaseScript(discardLabel)}
          actionLabel="手放す（確定）"
          onCancel={() => setConfirmKind(null)}
          onConfirm={() => {
            setConfirmKind(null);
            setDoneMsg(`（見本）${speakReleaseScript(discardLabel)}`);
            setSelectedDiscardId(null);
          }}
        />
      )}

      {confirmKind === "gain" && gainLabel && selectedFieldId && (
        <SpeakConfirmSheet
          script={speakGainScript(gainLabel)}
          actionLabel="得る（確定）"
          onCancel={() => setConfirmKind(null)}
          onConfirm={() => {
            setConfirmKind(null);
            setDoneMsg(`（見本）${speakGainScript(gainLabel)}`);
            setSelectedFieldId(null);
          }}
        />
      )}
    </main>
  );
}
