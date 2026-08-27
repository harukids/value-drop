import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_PLAYERS, seatedPlayers } from "@/lib/types";
import { savePlayerId } from "@/lib/player-storage";

export async function joinRoomAsGuest(
  supabase: SupabaseClient,
  code: string,
  displayName: string,
): Promise<{ playerId: string; displayName: string }> {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("code, phase, seat_order")
    .eq("code", code)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room) throw new Error("部屋が見つかりません");
  if (room.phase !== "LOBBY") {
    throw new Error("この部屋はすでに開始済みです");
  }

  const { data: playersNow, error: listError } = await supabase
    .from("players")
    .select("id, seat_index")
    .eq("room_code", code);
  if (listError) throw listError;
  const seatedCount = seatedPlayers(playersNow ?? []).length;
  if (seatedCount >= MAX_PLAYERS) {
    throw new Error(`この部屋は満員です（上限${MAX_PLAYERS}人）`);
  }

  const playerId = crypto.randomUUID();
  const name = displayName.trim() || "ゲスト";
  const seatIndex = seatedCount;
  const existingOrder = Array.isArray(room.seat_order) ? room.seat_order : [];

  const { error: playerError } = await supabase.from("players").insert({
    id: playerId,
    room_code: code,
    display_name: name,
    seat_index: seatIndex,
    is_host: false,
    hand: [],
  });
  if (playerError) throw playerError;

  const seatOrder = [...existingOrder, playerId];
  const { error: seatError } = await supabase
    .from("rooms")
    .update({ seat_order: seatOrder })
    .eq("code", code);
  if (seatError) throw seatError;

  savePlayerId(code, playerId);
  return { playerId, displayName: name };
}
