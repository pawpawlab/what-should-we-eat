import { NextResponse } from "next/server";
import { wgs84ToGcj02 } from "@/lib/geo";

/**
 * 逆地理编码：坐标 → 可读地址名。
 * 浏览器定位为 WGS-84，请求高德前需转成 GCJ-02。
 * 有高德 Web Service Key 时返回具体地址名，否则返回空（前端保留兜底名）。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const coord = searchParams.get("coord") ?? "wgs84";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ name: null }, { status: 400 });
  }

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) return NextResponse.json({ name: null });

  const point = coord === "wgs84" ? wgs84ToGcj02(lat, lng) : { lat, lng };

  try {
    const url = new URL("https://restapi.amap.com/v3/geocode/regeo");
    url.searchParams.set("key", key);
    url.searchParams.set("location", `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`);
    url.searchParams.set("extensions", "base");
    const resp = await fetch(url.toString());
    const data = await resp.json();

    if (data.status === "1" && data.regeocode) {
      const rc = data.regeocode;
      const comp = rc.addressComponent ?? {};
      // 优先取最近的商圈 / 街道 / POI 名，回退到 formatted_address
      const business =
        Array.isArray(comp.businessAreas) && comp.businessAreas.length > 0
          ? comp.businessAreas[0]?.name
          : undefined;
      const township =
        typeof comp.township === "string" && comp.township ? comp.township : undefined;
      const name = business || township || rc.formatted_address || null;
      return NextResponse.json({ name: name ? `${name}附近` : null });
    }
  } catch {
    // 返回空，前端保留兜底名
  }

  return NextResponse.json({ name: null });
}
