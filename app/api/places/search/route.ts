import { NextResponse } from "next/server";

/**
 * 地点搜索。
 * 有高德 Web Service Key → 走高德输入提示；否则返回空结果。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ places: [] });

  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (key) {
    try {
      const url = new URL("https://restapi.amap.com/v3/assistant/inputtips");
      url.searchParams.set("key", key);
      url.searchParams.set("keywords", q);
      url.searchParams.set("datatype", "poi");
      const resp = await fetch(url.toString());
      const data = await resp.json();
      if (data.status === "1") {
        const places = (data.tips ?? [])
          .filter((t: any) => t.location)
          .map((t: any) => {
            const [lng, lat] = String(t.location).split(",").map(Number);
            return {
              name: t.name,
              area: `${t.district ?? ""}`,
              lat,
              lng,
            };
          });
        return NextResponse.json({ places });
      }
    } catch {
      // 返回空结果
    }
  }

  return NextResponse.json({ places: [] });
}
