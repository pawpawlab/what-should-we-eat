import type { DiningRoom, Restaurant } from "@/types";
import { loadNearbyRestaurants } from "@/lib/restaurant-provider/client";
import { recommend, type RecommendResult } from "@/lib/recommendation-engine";

const cacheKey = (roomId: string) => `jcz:restaurants:v3:${roomId}`;

function requestedCategories(room: DiningRoom): string[] {
  const host =
    room.hostPreference?.preferCategories.filter((x) => x !== "都可以") ?? [];
  const guest = room.guestPreference?.preferCategories.filter((x) => x !== "都可以") ?? [];
  const guestSet = new Set(guest);
  const shared = host.filter((x) => guestSet.has(x));
  return Array.from(new Set(shared));
}

/** 拉取并缓存该房间附近餐厅（同一会话复用，避免重复请求） */
export async function ensureRestaurants(
  room: DiningRoom
): Promise<{ restaurants: Restaurant[]; source: "api" }> {
  const cached = getCachedRestaurants(room.id);
  if (cached && cached.length > 0) {
    return { restaurants: cached, source: "api" };
  }
  const res = await loadNearbyRestaurants({
    lat: room.location.lat,
    lng: room.location.lng,
    radius: room.radius,
    limit: 120,
    preferCategories: requestedCategories(room),
    coordSystem: room.location.coordSystem,
  });
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(cacheKey(room.id), JSON.stringify(res.restaurants));
  }
  return res;
}

export function getCachedRestaurants(roomId: string): Restaurant[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(cacheKey(roomId));
  return raw ? (JSON.parse(raw) as Restaurant[]) : null;
}

export function findRestaurant(
  roomId: string,
  id: string | undefined
): Restaurant | null {
  if (!id) return null;
  const list = getCachedRestaurants(roomId);
  return list?.find((r) => r.id === id) ?? null;
}

/**
 * 计算下一家推荐。
 * 需要双方偏好都已就绪。excludeIds = 已拒绝的餐厅。
 */
export function computeNext(
  room: DiningRoom,
  restaurants: Restaurant[]
): RecommendResult | null {
  // 双方偏好都就绪才计算
  if (!room.hostPreference || !room.guestPreference) return null;
  return recommend(
    {
      restaurants,
      host: room.hostPreference,
      guest: room.guestPreference,
      excludeIds: room.rejectedRestaurantIds,
    },
    room.radius
  );
}
