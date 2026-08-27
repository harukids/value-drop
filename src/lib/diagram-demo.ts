import {
  buildTeamSnapshot,
  type TeamReportPayload,
} from "@/lib/team-report";
import type { Player, Room } from "@/lib/types";

/** 図解と同じダミー。通信なし見本専用。 */
export const DEMO_ROOM_CODE = "DEMO";

export const DEMO_IDS = {
  akari: "demo-akari",
  sota: "demo-sota",
  minato: "demo-minato",
} as const;

export const AKARI_REASON =
  "大切にしたい人を守れる自分でいたい。愛があるとき、仕事の判断もぶれにくい。";

export const AKARI_STATEMENT =
  "わたしは愛を軸に、創造と探究を手放さない。大切にしたい人を守れる自分でいるために、仕事の判断もぶれない。";

export const SOTA_REASON =
  "縛られない働き方を守りたい。自由があると、感謝も伸びしろも残る。";

export const SOTA_STATEMENT =
  "わたしは自由を軸に、感謝と成長を手放さない。縛られない働き方を守るために、人への礼も、伸びる余地も残す。";

export const MINATO_REASON =
  "場を動かしたい。直感で踏み出して、スリルがあるほうを選ぶ。";

export const MINATO_STATEMENT =
  "わたしは影響力を軸に、直感とスリルを手放さない。場を動かすために、怖いくらいの一歩を先に出す。";

function player(
  partial: Partial<Player> & Pick<Player, "id" | "display_name" | "seat_index">,
): Player {
  return {
    room_code: DEMO_ROOM_CODE,
    hand: [],
    turns_completed: 0,
    main_card_id: null,
    sub_card_ids: [],
    reason: null,
    statement: null,
    ready_selecting: false,
    ready_writing: false,
    is_host: false,
    ...partial,
  };
}

const PLAY_FIELD = [
  "heart-01",
  "heart-03",
  "work-01",
  "growth-10",
  "growth-01",
  "heart-11",
  "work-07",
  "growth-13",
];

function playPlayers(): Player[] {
  return [
    player({
      id: DEMO_IDS.akari,
      display_name: "あかり",
      seat_index: 0,
      is_host: true,
      turns_completed: 2,
      hand: ["heart-02", "heart-09", "work-13", "growth-06", "growth-08"],
    }),
    player({
      id: DEMO_IDS.sota,
      display_name: "そうた",
      seat_index: 1,
      turns_completed: 2,
      hand: ["heart-05", "work-10", "growth-01", "work-05", "growth-07"],
    }),
    player({
      id: DEMO_IDS.minato,
      display_name: "みなと",
      seat_index: 2,
      turns_completed: 1,
      hand: ["heart-04", "work-08", "growth-04", "heart-14", "work-14"],
    }),
  ];
}

function playRoom(): Room {
  return {
    code: DEMO_ROOM_CODE,
    phase: "PLAYING",
    seat_order: [DEMO_IDS.akari, DEMO_IDS.sota, DEMO_IDS.minato],
    current_player_id: DEMO_IDS.akari,
    sub_state: "STEAL_CONFIRM",
    pending_card_id: "work-10",
    deny_count: 1,
    denied_card_ids: ["growth-07"],
    host_id: DEMO_IDS.akari,
    field: PLAY_FIELD,
  };
}

export type PlayView = "akari" | "sota";

export function getPlayConfirmDemo(view: PlayView): {
  room: Room;
  players: Player[];
  me: Player;
} {
  const players = playPlayers();
  const room = playRoom();
  const meId = view === "sota" ? DEMO_IDS.sota : DEMO_IDS.akari;
  const me = players.find((p) => p.id === meId)!;
  return { room, players, me };
}

const SELECT_HAND = [
  "heart-01",
  "work-13",
  "growth-18",
  "heart-02",
  "heart-09",
];

function endgamePlayers(ready: {
  selecting: boolean;
  writing: boolean;
}): Player[] {
  return [
    player({
      id: DEMO_IDS.akari,
      display_name: "あかり",
      seat_index: 0,
      is_host: true,
      hand: SELECT_HAND,
      main_card_id: "heart-01",
      sub_card_ids: ["work-13", "growth-18"],
      reason: ready.writing || ready.selecting ? AKARI_REASON : null,
      statement: ready.writing ? AKARI_STATEMENT : null,
      ready_selecting: ready.selecting,
      ready_writing: ready.writing,
    }),
    player({
      id: DEMO_IDS.sota,
      display_name: "そうた",
      seat_index: 1,
      hand: ["heart-05", "work-10", "growth-06", "work-05", "growth-07"],
      main_card_id: ready.selecting ? "work-10" : null,
      sub_card_ids: ready.selecting ? ["heart-05", "growth-07"] : [],
      ready_selecting: ready.selecting,
      ready_writing: false,
    }),
    player({
      id: DEMO_IDS.minato,
      display_name: "みなと",
      seat_index: 2,
      hand: ["heart-04", "work-08", "growth-04", "heart-14", "work-14"],
      main_card_id: ready.selecting ? "growth-04" : null,
      sub_card_ids: ready.selecting ? ["work-08", "heart-14"] : [],
      ready_selecting: ready.selecting,
      ready_writing: false,
    }),
  ];
}

export function getSelectDemo(): {
  room: Room;
  players: Player[];
  me: Player;
} {
  const players = endgamePlayers({ selecting: false, writing: false });
  const room: Room = {
    code: DEMO_ROOM_CODE,
    phase: "SELECTING",
    seat_order: [DEMO_IDS.akari, DEMO_IDS.sota, DEMO_IDS.minato],
    current_player_id: null,
    sub_state: null,
    pending_card_id: null,
    deny_count: 1,
    denied_card_ids: [],
    host_id: DEMO_IDS.akari,
    field: PLAY_FIELD,
  };
  return { room, players, me: players[0] };
}

export function getWriteDemo(): {
  room: Room;
  players: Player[];
  me: Player;
} {
  const players = endgamePlayers({ selecting: true, writing: false });
  const room: Room = {
    code: DEMO_ROOM_CODE,
    phase: "WRITING",
    seat_order: [DEMO_IDS.akari, DEMO_IDS.sota, DEMO_IDS.minato],
    current_player_id: null,
    sub_state: null,
    pending_card_id: null,
    deny_count: 1,
    denied_card_ids: [],
    host_id: DEMO_IDS.akari,
    field: PLAY_FIELD,
  };
  return { room, players, me: players[0] };
}

/** ワーク後のホスト結果。レポートと同じ3人のカード。 */
export function getResultDemo(): {
  room: Room;
  players: Player[];
  me: Player;
} {
  const players = [
    player({
      id: DEMO_IDS.akari,
      display_name: "あかり",
      seat_index: 0,
      is_host: true,
      hand: ["heart-01", "work-13", "growth-18", "heart-03", "growth-08"],
      main_card_id: "heart-01",
      sub_card_ids: ["work-13", "growth-18"],
      reason: AKARI_REASON,
      statement: AKARI_STATEMENT,
      ready_selecting: true,
      ready_writing: true,
    }),
    player({
      id: DEMO_IDS.sota,
      display_name: "そうた",
      seat_index: 1,
      hand: ["heart-02", "heart-09", "growth-06", "heart-05", "work-05"],
      main_card_id: "heart-02",
      sub_card_ids: ["heart-09", "growth-06"],
      reason: SOTA_REASON,
      statement: SOTA_STATEMENT,
      ready_selecting: true,
      ready_writing: true,
    }),
    player({
      id: DEMO_IDS.minato,
      display_name: "みなと",
      seat_index: 2,
      hand: ["work-09", "heart-14", "heart-06", "heart-04", "work-14"],
      main_card_id: "work-09",
      sub_card_ids: ["heart-14", "heart-06"],
      reason: MINATO_REASON,
      statement: MINATO_STATEMENT,
      ready_selecting: true,
      ready_writing: true,
    }),
  ];
  const room: Room = {
    code: DEMO_ROOM_CODE,
    phase: "RESULT",
    seat_order: [DEMO_IDS.akari, DEMO_IDS.sota, DEMO_IDS.minato],
    current_player_id: null,
    sub_state: null,
    pending_card_id: null,
    deny_count: 1,
    denied_card_ids: [],
    host_id: DEMO_IDS.akari,
    field: PLAY_FIELD,
  };
  return { room, players, me: players[0] };
}

/** 図解 shots/report.jpg と同じ構成。終わったあとのお土産。 */
export function getReportDemo(): TeamReportPayload {
  const { players } = getResultDemo();
  return {
    id: "demo-report",
    roomCode: DEMO_ROOM_CODE,
    groupLabel: "チーム1",
    snapshot: buildTeamSnapshot(DEMO_ROOM_CODE, "チーム1", players),
    analysis:
      "このチームは心・感情のカードが多く、愛や自由を軸にした対話が起きやすい傾向がある。気持ちや関係の話が先に出やすく、チームの空気をつくる力が強い。仕事・成果では影響力が入っており、成果や広がりを見る視点も持っている。成長・関係のカードは少なめなので、これから探究や成長にも目を向けると、いまの強みを保ったまま対話のバランスが取りやすくなるかもしれない。",
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}
