import type { NearbySearchParams, Restaurant } from "@/types";

/**
 * 客户端加载附近餐厅。
 * 只请求后端 /api/restaurants/nearby。失败或无数据时返回空列表，
 * 不再回退到虚拟餐厅。
 */
export async function loadNearbyRestaurants(
  params: NearbySearchParams
): Promise<{ restaurants: Restaurant[]; source: "api" }> {
  try {
    const resp = await fetch("/api/restaurants/nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
        source: "api",
      };
    }
  } catch {
    // ignore，返回空结果
  }

  return { restaurants: [], source: "api" };
}
