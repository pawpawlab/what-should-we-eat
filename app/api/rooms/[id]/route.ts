import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { patchToRow, roomForRole, rowToRoom } from "@/lib/room/row";

function roleFromHeaders(room: ReturnType<typeof rowToRoom>, req: Request) {
  const token = req.headers.get("x-room-token");
  const hintedRole = req.headers.get("x-room-role");
  if (token && token === room.hostToken) return "host" as const;
  if (token && token === room.guestToken) return "guest" as const;
  if (hintedRole === "host" || hintedRole === "guest") return "unknown" as const;
  return "unknown" as const;
}

async function getRoom(id: string) {
  const sb = getSupabaseAdminClient();
  if (!sb) return { missingConfig: true as const };
  const { data, error } = await sb.from("rooms").select().eq("id", id).maybeSingle();
  if (error) throw error;
  return { room: data ? rowToRoom(data) : null, sb };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await getRoom(params.id);
    if ("missingConfig" in result) {
      return NextResponse.json({ error: "missing_supabase_config" }, { status: 503 });
    }
    if (!result.room) return NextResponse.json({ room: null }, { status: 404 });
    const role = roleFromHeaders(result.room, req);
    return NextResponse.json({ room: roomForRole(result.room, role) });
  } catch {
    return NextResponse.json({ error: "room_fetch_failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await getRoom(params.id);
    if ("missingConfig" in result) {
      return NextResponse.json({ error: "missing_supabase_config" }, { status: 503 });
    }
    if (!result.room) return NextResponse.json({ room: null }, { status: 404 });

    const role = roleFromHeaders(result.room, req);
    if (role === "unknown") {
      return NextResponse.json({ error: "invalid_room_token" }, { status: 403 });
    }

    const body = await req.json();
    const rowPatch = patchToRow(body ?? {});
    if (Object.keys(rowPatch).length === 0) {
      return NextResponse.json({ room: roomForRole(result.room, role) });
    }

    const { data, error } = await result.sb
      .from("rooms")
      .update(rowPatch)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ room: roomForRole(rowToRoom(data), role) });
  } catch {
    return NextResponse.json({ error: "room_update_failed" }, { status: 500 });
  }
}
