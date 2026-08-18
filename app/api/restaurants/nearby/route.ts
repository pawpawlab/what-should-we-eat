import { NextResponse } from "next/server";
import {
  getServerRestaurantProvider,
  AmapRestaurantProvider,
} from "@/lib/restaurant-provider";
import { wgs84ToGcj02 } from "@/lib/geo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, radius, limit, coordSystem, preferCategories } = body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "invalid params" }, { status: 400 });
    }

    const provider = getServerRestaurantProvider();
    if (!provider) {
      return NextResponse.json({
        restaurants: [],
        unavailable: "missing_amap_key",
      });
    }

    // 只有请求高德真实 POI 时，才把 WGS-84 定位坐标转换为 GCJ-02
    let qlat = lat;
    let qlng = lng;
    if (provider instanceof AmapRestaurantProvider && coordSystem === "wgs84") {
      const c = wgs84ToGcj02(lat, lng);
      qlat = c.lat;
      qlng = c.lng;
    }

    try {
      const restaurants = await provider.searchNearbyRestaurants({
        lat: qlat,
        lng: qlng,
        radius: radius ?? 2000,
        limit,
        preferCategories: Array.isArray(preferCategories) ? preferCategories : undefined,
      });
      return NextResponse.json({ restaurants });
    } catch {
      return NextResponse.json({
        restaurants: [],
        error: "restaurant_provider_failed",
      });
    }
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
