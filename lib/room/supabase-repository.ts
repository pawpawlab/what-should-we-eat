import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiningRoom, LocationInfo, UserPreference } from "@/types";
import type { RoomRepository } from "./repository";
import { genRoomId, genToken } from "./id";

/** DB 行（snake_case）→ DiningRoom（camelCase）映射 */
function rowToRoom(row: any): DiningRoom {
  return {
    id: row.id,
    status: row.status,
    location: row.location,
    radius: row.radius,
    hostPreference: row.host_preference ?? undefined,
    guestPreference: row.guest_preference ?? undefined,
    guestJoined: row.guest_joined ?? false,
    recommendedRestaurantIds: row.recommended_restaurant_ids ?? [],
    rejectedRestaurantIds: row.rejected_restaurant_ids ?? [],
    selectedRestaurantId: row.selected_restaurant_id ?? undefined,
    hostToken: row.host_token,
    guestToken: row.guest_token,
    createdAt: row.created_at,
  };
}

/** DiningRoom 部分字段 → DB 行 */
function patchToRow(patch: Partial<DiningRoom>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.radius !== undefined) row.radius = patch.radius;
  if (patch.hostPreference !== undefined) row.host_preference = patch.hostPreference;
  if (patch.guestPreference !== undefined) row.guest_preference = patch.guestPreference;
  if (patch.guestJoined !== undefined) row.guest_joined = patch.guestJoined;
  if (patch.recommendedRestaurantIds !== undefined)
    row.recommended_restaurant_ids = patch.recommendedRestaurantIds;
  if (patch.rejectedRestaurantIds !== undefined)
    row.rejected_restaurant_ids = patch.rejectedRestaurantIds;
  if (patch.selectedRestaurantId !== undefined)
    row.selected_restaurant_id = patch.selectedRestaurantId;
  return row;
}

/**
 * Supabase 实现：跨设备真实实时同步（Postgres Changes）。
 */
export class SupabaseRoomRepository implements RoomRepository {
  constructor(private sb: SupabaseClient) {}

  async createRoom(input: {
    location: LocationInfo;
    radius: number;
    hostPreference?: UserPreference;
  }): Promise<DiningRoom> {
    const room: DiningRoom = {
      id: genRoomId(),
      status: "waiting",
      location: input.location,
      radius: input.radius,
      hostPreference: input.hostPreference,
      guestJoined: false,
      recommendedRestaurantIds: [],
      rejectedRestaurantIds: [],
      hostToken: genToken(),
      guestToken: genToken(),
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await this.sb
      .from("rooms")
      .insert({
        id: room.id,
        status: room.status,
        location: room.location,
        radius: room.radius,
        host_preference: room.hostPreference ?? null,
        guest_joined: false,
        recommended_restaurant_ids: [],
        rejected_restaurant_ids: [],
        host_token: room.hostToken,
        guest_token: room.guestToken,
        created_at: room.createdAt,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToRoom(data);
  }

  async getRoom(id: string): Promise<DiningRoom | null> {
    const { data, error } = await this.sb
      .from("rooms")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToRoom(data) : null;
  }

  async updateRoom(
    id: string,
    patch: Partial<DiningRoom>
  ): Promise<DiningRoom | null> {
    const { data, error } = await this.sb
      .from("rooms")
      .update(patchToRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data ? rowToRoom(data) : null;
  }

  subscribe(id: string, cb: (room: DiningRoom) => void): () => void {
    const channel = this.sb
      .channel(`room:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) cb(rowToRoom(payload.new));
        }
      )
      .subscribe();

    return () => {
      this.sb.removeChannel(channel);
    };
  }
}
