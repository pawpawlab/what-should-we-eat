import type { DiningRoom } from "@/types";

export function rowToRoom(row: any): DiningRoom {
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
    hostToken: row.host_token ?? "",
    guestToken: row.guest_token ?? "",
    createdAt: row.created_at,
  };
}

export function roomToRow(room: DiningRoom): Record<string, unknown> {
  return {
    id: room.id,
    status: room.status,
    location: room.location,
    radius: room.radius,
    host_preference: room.hostPreference ?? null,
    guest_preference: room.guestPreference ?? null,
    guest_joined: room.guestJoined ?? false,
    recommended_restaurant_ids: room.recommendedRestaurantIds,
    rejected_restaurant_ids: room.rejectedRestaurantIds,
    selected_restaurant_id: room.selectedRestaurantId ?? null,
    host_token: room.hostToken,
    guest_token: room.guestToken,
    created_at: room.createdAt,
  };
}

export function patchToRow(patch: Partial<DiningRoom>): Record<string, unknown> {
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

export function roomForRole(
  room: DiningRoom,
  role: "host" | "guest" | "unknown"
): DiningRoom {
  if (role === "host") return room;
  if (role === "guest") return { ...room, hostToken: "" };
  return { ...room, hostToken: "", guestToken: "" };
}
