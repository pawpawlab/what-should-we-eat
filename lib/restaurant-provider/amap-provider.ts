import type {
  NearbySearchParams,
  Restaurant,
  RestaurantProvider,
} from "@/types";
import { isOpenNow } from "@/lib/geo";
import {
  flattenConfidentTags,
  inferRestaurantTags,
} from "@/lib/restaurant-tagger";

/**
 * 高德 POI 数据源（Phase 5）。仅在 Server 端使用，绝不暴露 Secret Key。
 * 注意：高德使用 GCJ-02 坐标系，若定位来自浏览器 WGS-84，生产环境需做坐标转换。
 */
export class AmapRestaurantProvider implements RestaurantProvider {
  constructor(private key: string) {}

  async searchNearbyRestaurants(
    params: NearbySearchParams
  ): Promise<Restaurant[]> {
    const target = params.limit ?? 100;
    const pageSize = Math.min(25, target);
    const maxPages = Math.ceil(target / pageSize);
    const restaurants: Restaurant[] = [];
    const seen = new Set<string>();
    const hasPreferredCategories = (params.preferCategories ?? []).some(
      (x) => x !== "都可以"
    );

    // 1) 若选了想吃的品类，先定向补搜（用「日本料理/寿司/火锅」等精确关键词），
    //    确保稍远一点、普通分页排不到的对口餐厅（如日料/火锅店）也能进候选。
    if (hasPreferredCategories) {
      await this.supplementPreferredCategories(params, restaurants, seen);
    }

    // 2) 无论是否补搜过，都跑普通 around 分页，与补搜结果合并去重。
    //    这样既覆盖想吃的品类，又保留足够多的「折中」候选（其他品类的店），
    //    不会因为补搜有结果就丢掉普通搜索的几十家。
    for (let page = 1; page <= maxPages; page++) {
      if (restaurants.length >= target) break;
      let pois: any[] = [];
      try {
        pois = await this.searchPage(params, page, pageSize);
      } catch {
        // 普通搜索失败时：只要补搜已有结果就用补搜的，否则抛错。
        if (restaurants.length > 0) break;
        throw new Error("AMap around failed");
      }
      if (pois.length === 0) break;

      for (const poi of pois) {
        this.addPoi(poi, restaurants, seen);
      }

      if (pois.length < pageSize) break;
    }

    return restaurants;
  }

  private async searchPage(
    params: NearbySearchParams,
    page: number,
    pageSize: number,
    keywords?: string
  ): Promise<any[]> {
    const url = new URL("https://restapi.amap.com/v5/place/around");
    url.searchParams.set("key", this.key);
    url.searchParams.set("location", `${params.lng},${params.lat}`);
    url.searchParams.set("radius", String(params.radius));
    url.searchParams.set("types", "050000"); // 餐饮服务
    if (keywords) url.searchParams.set("keywords", keywords);
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("page_num", String(page));
    url.searchParams.set("show_fields", "business,photos");

    const resp = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!resp.ok) throw new Error(`AMap HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.status !== "1") throw new Error(`AMap error: ${data.info}`);

    return data.pois ?? [];
  }

  private async supplementPreferredCategories(
    params: NearbySearchParams,
    restaurants: Restaurant[],
    seen: Set<string>
  ) {
    const categories = Array.from(
      new Set((params.preferCategories ?? []).filter((x) => x !== "都可以"))
    ).slice(0, 4);
    if (categories.length === 0) return;

    const queries = categories.flatMap((category) =>
      CATEGORY_SEARCH_KEYWORDS[category] ?? [category]
    );

    for (const keywords of Array.from(new Set(queries)).slice(0, 8)) {
      try {
        const pois = await this.searchPage(params, 1, 25, keywords);
        for (const poi of pois) this.addPoi(poi, restaurants, seen);
      } catch {
        // 定向补搜失败时保留普通 around 结果。
      }
    }
  }

  private addPoi(poi: any, restaurants: Restaurant[], seen: Set<string>) {
    const restaurant = this.mapPoi(poi);
    if (seen.has(restaurant.id)) return;
    seen.add(restaurant.id);
    restaurants.push(restaurant);
  }

  private mapPoi(poi: any): Restaurant {
    const [lng, lat] = String(poi.location ?? "0,0").split(",").map(Number);
    const business = poi.business ?? {};
    const address = poi.address || undefined;
    const inferred = inferRestaurantTags({
      name: poi.name,
      type: String(poi.type ?? ""),
      address,
      businessTag: business.tag,
      alias: business.alias,
    });
    const categories = flattenConfidentTags(inferred.categories, 0.5);
    const tags = flattenConfidentTags(inferred.tasteTags, 0.4);
    const hours = business.opentime2 || business.opentime_today || undefined;
    return {
      id: `amap_${poi.id}`,
      name: poi.name,
      location: { lat, lng },
      address,
      distance: poi.distance ? Number(poi.distance) : undefined,
      categories: categories.length > 0 ? categories : ["其他"],
      tags,
      inferredCategories: inferred.categories,
      inferredTasteTags: inferred.tasteTags,
      rating: business.rating ? Number(business.rating) : undefined,
      averagePrice: business.cost ? Number(business.cost) : undefined,
      businessHours: hours,
      isOpen: isOpenNow(hours),
      photos: (poi.photos ?? []).map((p: any) => p.url).filter(Boolean),
      source: "amap",
      sourceId: String(poi.id),
    };
  }
}

const CATEGORY_SEARCH_KEYWORDS: Record<string, string[]> = {
  日料: ["日本料理", "寿司"],
  韩餐: ["韩国料理", "韩餐"],
  云贵川菜: ["川菜", "贵州菜", "云南菜"],
  粤菜: ["粤菜", "广东菜"],
  江浙菜: ["江浙菜", "浙江菜", "杭帮菜"],
  西餐: ["西餐", "牛排"],
  东南亚: ["东南亚菜", "泰国菜", "越南菜"],
  火锅: ["火锅"],
  烧烤: ["烧烤", "烤串"],
  烤肉: ["烤肉", "烧肉"],
  粉面: ["面馆", "拉面", "米粉", "米线"],
  饺子: ["饺子", "馄饨"],
  炸鸡: ["炸鸡"],
  咖喱: ["咖喱"],
  轻食: ["轻食", "沙拉"],
  快餐: ["快餐"],
};
