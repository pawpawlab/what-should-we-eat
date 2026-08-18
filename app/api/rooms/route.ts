import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { genRoomId, genToken } from "@/lib/room/id";
import { roomToRow, rowToRoom } from "@/lib/room/row";
import type { DiningRoom } from "@/types";

export async function POST(req: Request) {
  const sb = getSupabaseAdminClient();
  if (!sb) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 503 });
  }

  try {
    const body = await req.json();
    if (!body?.location) {
      return NextResponse.json({ error: "invalid_room" }, { status: 400 });
    }

    const room: DiningRoom = {
      id: genRoomId(),
      status: "waiting",
      location: body.location,
      radius: body.radius ?? 2000,
      hostPreference: body.hostPreference,
      guestJoined: false,
      recommendedRestaurantIds: [],
      rejectedRestaurantIds: [],
      hostToken: genToken(),
      guestToken: genToken(),
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await sb.from("rooms").insert(roomToRow(room)).select().single();
    if (error) throw error;

    return NextResponse.json({ room: rowToRoom(data) });
  } catch (e: any) {
    console.error("[rooms] create failed:", e?.message ?? e);
    return NextResponse.json({ error: "room_create_failed" }, { status: 500 });
  }
}
