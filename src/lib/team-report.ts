import { DECK, getCard, PILLAR_LABEL } from "@/lib/deck";
import type { Pillar, Player } from "@/lib/types";

export const MAX_TEAM_GROUPS = 4;

export type TeamMemberSnapshot = {
  id: string;
  displayName: string;
  mainCardId?: string | null;
  subCardIds?: string[];
  mainLabel: string | null;
  mainPillar: Pillar | null;
  subLabels: string[];
};

export type TeamSnapshot = {
  roomCode: string;
  groupLabel: string;
  memberCount: number;
  members: TeamMemberSnapshot[];
  pillarMain: Record<Pillar, number>;
  pillarAll: Record<Pillar, number>;
};

export type TeamReportPayload = {
  id: string;
  roomCode: string;
  groupLabel: string;
  snapshot: TeamSnapshot;
  analysis: string;
  createdAt: string;
};

export function emptyPillarCounts(): Record<Pillar, number> {
  return { heart: 0, work: 0, growth: 0 };
}

/** スナップショットから価値観カードIDを復元（メイン＋サブ） */
export function resolveValueCardIds(snapshot: TeamSnapshot): string[] {
  const { mains, subs } = resolveMainAndSubCardIds(snapshot);
  return [...mains, ...subs];
}

export type SubCardWithOwner = {
  cardId: string;
  label: string;
  owners: string[];
};

export function resolveMainAndSubCardIds(snapshot: TeamSnapshot): {
  mains: string[];
  subs: string[];
} {
  const owned = resolveSubCardsWithOwners(snapshot);
  const mains: string[] = [];
  const seenMain = new Set<string>();

  for (const m of snapshot.members) {
    const id =
      m.mainCardId ||
      (m.mainLabel ? DECK.find((c) => c.label === m.mainLabel)?.id : null);
    if (!id || seenMain.has(id)) continue;
    seenMain.add(id);
    mains.push(id);
  }

  return { mains, subs: owned.map((s) => s.cardId) };
}

/** サブカード＋持ち主（同一カードは所有者をまとめる） */
export function resolveSubCardsWithOwners(
  snapshot: TeamSnapshot,
): SubCardWithOwner[] {
  const byId = new Map<string, SubCardWithOwner>();
  const order: string[] = [];

  const push = (cardId: string, owner: string) => {
    const card = getCard(cardId);
    if (!card) return;
    const existing = byId.get(cardId);
    if (existing) {
      if (!existing.owners.includes(owner)) existing.owners.push(owner);
      return;
    }
    byId.set(cardId, {
      cardId,
      label: card.label,
      owners: [owner],
    });
    order.push(cardId);
  };

  for (const m of snapshot.members) {
    if (m.subCardIds && m.subCardIds.length > 0) {
      for (const sid of m.subCardIds) push(sid, m.displayName);
    } else if (m.subLabels?.length) {
      for (const label of m.subLabels) {
        const hit = DECK.find((c) => c.label === label);
        if (hit) push(hit.id, m.displayName);
      }
    }
  }

  return order.map((id) => byId.get(id)!);
}

/** @deprecated use resolveValueCardIds */
export function resolveMainCardIds(snapshot: TeamSnapshot): string[] {
  return resolveMainAndSubCardIds(snapshot).mains;
}

export function buildTeamSnapshot(
  roomCode: string,
  groupLabel: string,
  members: Player[],
): TeamSnapshot {
  const pillarMain = emptyPillarCounts();
  const pillarAll = emptyPillarCounts();
  const memberSnaps: TeamMemberSnapshot[] = [];

  for (const p of members) {
    const main = p.main_card_id ? getCard(p.main_card_id) : null;
    const subs = (p.sub_card_ids ?? [])
      .map((id) => getCard(id))
      .filter(Boolean);

    if (main) {
      pillarMain[main.pillar] += 1;
      pillarAll[main.pillar] += 1;
    }
    for (const s of subs) {
      if (s) pillarAll[s.pillar] += 1;
    }

    memberSnaps.push({
      id: p.id,
      displayName: p.display_name,
      mainCardId: p.main_card_id,
      subCardIds: p.sub_card_ids ?? [],
      mainLabel: main?.label ?? null,
      mainPillar: main?.pillar ?? null,
      subLabels: subs.map((s) => s!.label),
    });
  }

  return {
    roomCode,
    groupLabel,
    memberCount: members.length,
    members: memberSnaps,
    pillarMain,
    pillarAll,
  };
}

export function pillarSummaryLines(snapshot: TeamSnapshot): string[] {
  const lines: string[] = [];
  lines.push(`対象: このチーム（${snapshot.memberCount}人）`);
  lines.push(`内部ラベル: ${snapshot.groupLabel}`);
  lines.push("メインの柱:");
  (["heart", "work", "growth"] as Pillar[]).forEach((p) => {
    lines.push(`- ${PILLAR_LABEL[p]}: ${snapshot.pillarMain[p]}`);
  });
  lines.push("メイン＋サブの柱:");
  (["heart", "work", "growth"] as Pillar[]).forEach((p) => {
    lines.push(`- ${PILLAR_LABEL[p]}: ${snapshot.pillarAll[p]}`);
  });
  lines.push("各自のメイン:");
  for (const m of snapshot.members) {
    lines.push(
      `- ${m.displayName}: ${m.mainLabel ?? "未設定"}${
        m.mainPillar ? `（${PILLAR_LABEL[m.mainPillar]}）` : ""
      }`,
    );
  }
  return lines;
}

export function assertAdminSecret(provided: string | null | undefined): void {
  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) {
    throw new Error("ADMIN_SECRET がサーバーに設定されていません");
  }
  if (!provided || provided !== expected) {
    throw new Error("合言葉が違います");
  }
}
