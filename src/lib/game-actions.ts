import { DECK, shuffle } from "@/lib/deck";
import {
  HAND_SIZE,
  MAX_DENY,
  TURNS_PER_PLAYER,
  seatedPlayers,
  type Player,
  type Room,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function nextSeatId(seatOrder: string[], currentId: string): string {
  const i = seatOrder.indexOf(currentId);
  if (i < 0) return seatOrder[0];
  return seatOrder[(i + 1) % seatOrder.length];
}

export function dealHands(seatOrder: string[]): {
  hands: Record<string, string[]>;
  field: string[];
} {
  const shuffled = shuffle(DECK.map((c) => c.id));
  const hands: Record<string, string[]> = {};
  let cursor = 0;
  for (const playerId of seatOrder) {
    hands[playerId] = shuffled.slice(cursor, cursor + HAND_SIZE);
    cursor += HAND_SIZE;
  }
  return { hands, field: shuffled.slice(cursor) };
}

type Ctx = {
  supabase: SupabaseClient;
  room: Room;
  players: Player[];
  actorId: string;
};

function requirePlayer(players: Player[], id: string): Player {
  const p = players.find((x) => x.id === id);
  if (!p) throw new Error("プレイヤーが見つかりません");
  return p;
}

export async function startAndDeal(
  supabase: SupabaseClient,
  code: string,
  ordered: Player[],
) {
  const seatOrder = ordered.map((p) => p.id);
  const { hands, field } = dealHands(seatOrder);

  await Promise.all(
    ordered.map((p, i) =>
      supabase
        .from("players")
        .update({
          seat_index: i,
          hand: hands[p.id],
          turns_completed: 0,
          main_card_id: null,
          sub_card_ids: [],
          reason: null,
          statement: null,
          ready_selecting: false,
          ready_writing: false,
        })
        .eq("id", p.id),
    ),
  );

  const { error } = await supabase
    .from("rooms")
    .update({
      phase: "PLAYING",
      seat_order: seatOrder,
      current_player_id: seatOrder[0],
      sub_state: "STEAL_SELECT",
      deny_count: 0,
      denied_card_ids: [],
      pending_card_id: null,
      field,
    })
    .eq("code", code);
  if (error) throw error;
}

export async function selectStealCard({
  supabase,
  room,
  players,
  actorId,
  cardId,
}: Ctx & { cardId: string }) {
  if (room.phase !== "PLAYING" || room.sub_state !== "STEAL_SELECT") {
    throw new Error("いまはカードを選べません");
  }
  if (room.current_player_id !== actorId) throw new Error("あなたの手番ではありません");
  const victimId = nextSeatId(room.seat_order, actorId);
  const victim = requirePlayer(players, victimId);
  if (!victim.hand.includes(cardId)) throw new Error("そのカードは隣の手札にありません");
  const denied = room.denied_card_ids ?? [];
  if (denied.includes(cardId)) {
    throw new Error("この手番ですでに「ダメ」されたカードです");
  }

  const { error } = await supabase
    .from("rooms")
    .update({ pending_card_id: cardId, sub_state: "STEAL_CONFIRM" })
    .eq("code", room.code);
  if (error) throw error;
}

export async function confirmSteal({
  supabase,
  room,
  players,
  actorId,
  accept,
}: Ctx & { accept: boolean }) {
  if (room.phase !== "PLAYING" || room.sub_state !== "STEAL_CONFIRM") {
    throw new Error("いまは応答できません");
  }
  const currentId = room.current_player_id;
  if (!currentId || !room.pending_card_id) throw new Error("選ばれたカードがありません");
  const victimId = nextSeatId(room.seat_order, currentId);
  if (actorId !== victimId) throw new Error("隣の人だけが応答できます");

  if (!accept) {
    if (room.deny_count >= MAX_DENY) {
      throw new Error("この手番の「ダメ」は使い切りました");
    }
    const denied = [...(room.denied_card_ids ?? [])];
    if (!denied.includes(room.pending_card_id)) {
      denied.push(room.pending_card_id);
    }
    const { error } = await supabase
      .from("rooms")
      .update({
        deny_count: room.deny_count + 1,
        denied_card_ids: denied,
        pending_card_id: null,
        sub_state: "STEAL_SELECT",
      })
      .eq("code", room.code);
    if (error) throw error;
    return;
  }

  const victim = requirePlayer(players, victimId);
  const current = requirePlayer(players, currentId);
  const cardId = room.pending_card_id;
  if (!victim.hand.includes(cardId)) throw new Error("カードが既にありません");

  const victimHand = victim.hand.filter((id) => id !== cardId);
  const currentHand = [...current.hand, cardId];

  const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
    supabase.from("players").update({ hand: victimHand }).eq("id", victimId),
    supabase.from("players").update({ hand: currentHand }).eq("id", currentId),
    supabase
      .from("rooms")
      .update({
        pending_card_id: null,
        denied_card_ids: [],
        sub_state: "DISCARD",
      })
      .eq("code", room.code),
  ]);
  if (e1 || e2 || e3) throw e1 || e2 || e3;
}

export async function discardCard({
  supabase,
  room,
  players,
  actorId,
  cardId,
}: Ctx & { cardId: string }) {
  if (room.phase !== "PLAYING" || room.sub_state !== "DISCARD") {
    throw new Error("いまは捨てられません");
  }
  if (room.current_player_id !== actorId) throw new Error("あなたの手番ではありません");
  const current = requirePlayer(players, actorId);
  if (!current.hand.includes(cardId)) throw new Error("そのカードは手札にありません");

  const nextHand = current.hand.filter((id) => id !== cardId);
  const nextField = [...room.field, cardId];

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("players").update({ hand: nextHand }).eq("id", actorId),
    supabase
      .from("rooms")
      .update({ field: nextField, sub_state: "GAIN" })
      .eq("code", room.code),
  ]);
  if (e1 || e2) throw e1 || e2;
}

export async function gainCard({
  supabase,
  room,
  players,
  actorId,
  cardId,
}: Ctx & { cardId: string }) {
  if (room.phase !== "PLAYING" || room.sub_state !== "GAIN") {
    throw new Error("いまは得られません");
  }
  const currentId = room.current_player_id;
  if (!currentId) throw new Error("手番が不明です");
  const victimId = nextSeatId(room.seat_order, currentId);
  if (actorId !== victimId) throw new Error("奪われた人だけが場から得られます");
  if (!room.field.includes(cardId)) throw new Error("そのカードは場にありません");

  const victim = requirePlayer(players, victimId);
  const current = requirePlayer(players, currentId);
  const nextField = room.field.filter((id) => id !== cardId);
  const nextHand = [...victim.hand, cardId];
  const currentTurns = current.turns_completed + 1;
  const seatedIds =
    room.seat_order.length > 0
      ? room.seat_order
      : seatedPlayers(players).map((p) => p.id);
  const allDone = seatedIds.every((id) => {
    const turns =
      id === currentId
        ? currentTurns
        : (players.find((p) => p.id === id)?.turns_completed ?? 0);
    return turns >= TURNS_PER_PLAYER;
  });

  const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
    supabase.from("players").update({ hand: nextHand }).eq("id", victimId),
    supabase
      .from("players")
      .update({ turns_completed: currentTurns })
      .eq("id", currentId),
    supabase
      .from("rooms")
      .update(
        allDone
          ? {
              field: nextField,
              phase: "SELECTING",
              sub_state: null,
              current_player_id: null,
              pending_card_id: null,
              deny_count: 0,
              denied_card_ids: [],
            }
          : {
              field: nextField,
              current_player_id: nextSeatId(room.seat_order, currentId),
              sub_state: "STEAL_SELECT",
              pending_card_id: null,
              deny_count: 0,
              denied_card_ids: [],
            },
      )
      .eq("code", room.code),
  ]);
  if (e1 || e2 || e3) throw e1 || e2 || e3;
}

export async function skipTurn({
  supabase,
  room,
  actorId,
  players,
}: {
  supabase: SupabaseClient;
  room: Room;
  actorId: string;
  players: Player[];
}) {
  if (room.phase !== "PLAYING") throw new Error("プレイ中のみスキップできます");
  const host = room.host_id;
  if (actorId !== host) throw new Error("ホストだけがスキップできます");
  const currentId = room.current_player_id;
  if (!currentId) throw new Error("手番がありません");

  const ok = typeof window !== "undefined"
    ? window.confirm("この手番をまるごとスキップしますか？（途中の選択は破棄されます）")
    : true;
  if (!ok) return;

  const current = players.find((p) => p.id === currentId);
  const currentTurns = (current?.turns_completed ?? 0) + 1;
  const seatedIds =
    room.seat_order.length > 0
      ? room.seat_order
      : seatedPlayers(players).map((p) => p.id);
  const allDone = seatedIds.every((id) => {
    const turns =
      id === currentId
        ? currentTurns
        : (players.find((p) => p.id === id)?.turns_completed ?? 0);
    return turns >= TURNS_PER_PLAYER;
  });

  const [{ error: playerError }, { error: roomError }] = await Promise.all([
    current
      ? supabase
          .from("players")
          .update({ turns_completed: currentTurns })
          .eq("id", currentId)
      : Promise.resolve({ error: null }),
    supabase
      .from("rooms")
      .update(
        allDone
          ? {
              phase: "SELECTING",
              sub_state: null,
              current_player_id: null,
              pending_card_id: null,
              deny_count: 0,
              denied_card_ids: [],
            }
          : {
              current_player_id: nextSeatId(room.seat_order, currentId),
              sub_state: "STEAL_SELECT",
              pending_card_id: null,
              deny_count: 0,
              denied_card_ids: [],
            },
      )
      .eq("code", room.code),
  ]);
  if (playerError || roomError) throw playerError || roomError;
}

export async function submitSelection({
  supabase,
  room,
  players,
  actorId,
  mainCardId,
  subCardIds,
}: Ctx & { mainCardId: string; subCardIds: [string, string] }) {
  if (room.phase !== "SELECTING" && room.phase !== "WRITING") {
    throw new Error("選定フェーズではありません");
  }
  const me = requirePlayer(players, actorId);
  if (me.ready_selecting) throw new Error("すでに選定済みです");
  if (!me.hand.includes(mainCardId)) throw new Error("メインが手札にありません");
  if (subCardIds[0] === subCardIds[1]) throw new Error("サブは違う2枚を選んでください");
  if (subCardIds.includes(mainCardId)) throw new Error("メインとサブは重ねられません");
  for (const id of subCardIds) {
    if (!me.hand.includes(id)) throw new Error("サブが手札にありません");
  }

  const { error } = await supabase
    .from("players")
    .update({
      main_card_id: mainCardId,
      sub_card_ids: subCardIds,
      ready_selecting: true,
    })
    .eq("id", actorId);
  if (error) throw error;
  // 選定が終わった人から理由へ進める（部屋 phase は全員の理由送信まで SELECTING のまま）
}

/** 理由送信前だけ。選定をやり直す */
export async function revertSelection({
  supabase,
  room,
  players,
  actorId,
}: Ctx) {
  if (room.phase !== "SELECTING" && room.phase !== "WRITING") {
    throw new Error("いまは選定に戻れません");
  }
  const me = requirePlayer(players, actorId);
  if (!me.ready_selecting) throw new Error("まだ選定していません");
  if (me.ready_writing) throw new Error("理由を送ったあとは選定に戻れません");

  const { error } = await supabase
    .from("players")
    .update({
      main_card_id: null,
      sub_card_ids: [],
      ready_selecting: false,
      reason: null,
    })
    .eq("id", actorId);
  if (error) throw error;

  if (room.phase === "WRITING") {
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ phase: "SELECTING" })
      .eq("code", room.code);
    if (roomError) throw roomError;
  }
}

export async function submitReason({
  supabase,
  room,
  players,
  actorId,
  reason,
}: Ctx & { reason: string }) {
  if (room.phase !== "SELECTING" && room.phase !== "WRITING") {
    throw new Error("理由入力フェーズではありません");
  }
  const me = requirePlayer(players, actorId);
  if (!me.ready_selecting) throw new Error("先に価値観を選んでください");
  if (me.ready_writing) throw new Error("すでに送信済みです");
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("理由を書いてください");
  if (trimmed.length > 200) throw new Error("200文字以内にしてください");

  const { error } = await supabase
    .from("players")
    .update({ reason: trimmed, ready_writing: true })
    .eq("id", actorId);
  if (error) throw error;

  // クライアントの古い players ではなく DB 最新で判定（同時送信の取りこぼし防止）
  await ensureResultPhase({ supabase, roomCode: room.code });
}

/** 全員の選定＋理由が揃っていれば RESULT へ。同時送信や取りこぼしの回収にも使う */
export async function ensureResultPhase({
  supabase,
  roomCode,
}: {
  supabase: SupabaseClient;
  roomCode: string;
}) {
  const { data: latest, error } = await supabase
    .from("players")
    .select("ready_selecting, ready_writing, seat_index")
    .eq("room_code", roomCode);
  if (error) throw error;
  const seated = seatedPlayers(latest ?? []);
  if (!seated.length) return;
  if (!seated.every((p) => p.ready_selecting && p.ready_writing)) return;

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ phase: "RESULT" })
    .eq("code", roomCode)
    .in("phase", ["SELECTING", "WRITING"]);
  if (roomError) throw roomError;
}

export async function closeRoom({
  supabase,
  room,
  actorId,
}: {
  supabase: SupabaseClient;
  room: Room;
  actorId: string;
}) {
  if (actorId !== room.host_id) throw new Error("ホストだけが閉じられます");
  const { error } = await supabase
    .from("rooms")
    .update({ phase: "CLOSED", closed_at: new Date().toISOString() })
    .eq("code", room.code);
  if (error) throw error;
}

export async function saveStatement({
  supabase,
  actorId,
  statement,
}: {
  supabase: SupabaseClient;
  actorId: string;
  statement: string;
}) {
  const trimmed = statement.trim();
  if (!trimmed) throw new Error("ステートメントが空です");
  if (trimmed.length > 500) throw new Error("ステートメントが長すぎます");
  const { error } = await supabase
    .from("players")
    .update({ statement: trimmed })
    .eq("id", actorId);
  if (error) throw error;
}

export function formatResultsText(players: Player[]): string {
  const lines = ["Value Drop 結果", ""];
  for (const p of seatedPlayers(players)) {
    const finalFive = (p.hand ?? [])
      .map((id) => DECK.find((c) => c.id === id)?.label ?? id)
      .join("、");
    const main = p.main_card_id
      ? (DECK.find((c) => c.id === p.main_card_id)?.label ?? p.main_card_id)
      : "未設定";
    const subs = (p.sub_card_ids ?? [])
      .map((id) => DECK.find((c) => c.id === id)?.label ?? id)
      .join("、");
    lines.push(`【${p.display_name}】`);
    lines.push(`最終5枚: ${finalFive || "（なし）"}`);
    lines.push(`メイン: ${main}`);
    lines.push(`サブ: ${subs || "未設定"}`);
    lines.push(`理由: ${p.reason ?? ""}`);
    if (p.statement) lines.push(`ステートメント: ${p.statement}`);
    lines.push("");
  }
  return lines.join("\n");
}
