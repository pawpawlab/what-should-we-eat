import type { Restaurant, UserPreference } from "@/types";
import { TASTE_TAG_ALIAS, RECOMMEND_CONFIG as C } from "./config";

export interface RecommendReason {
  /** 命中用户想吃、且这家满足的品类 */
  bothWant: string[];
  categoryMatchScope: "both" | "either";
  /** 命中用户想要、且这家满足的口味 */
  matchedTastes: string[];
  tasteMatchScope: "both" | "either";
  /** 帮双方避开的品类 */
  avoided: string[];
  /** 其他亮点，如「评分不错」「距离不远」 */
  extra: string[];
}

export interface RecommendResult {
  restaurant: Restaurant;
  reason: RecommendReason;
  /** 剩余可推荐候选数（用于「快挑完了」提示） */
  remaining: number;
}

export interface RecommendInput {
  restaurants: Restaurant[];
  host: UserPreference;
  guest: UserPreference;
  /** 已被拒绝 / 已展示过、需要排除的餐厅 id */
  excludeIds?: string[];
  /** 兼容旧测试入参；推荐已改为确定性最高分优先 */
  random?: () => number;
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

const intersect = (a: string[], b: string[]) =>
  a.filter((x) => b.includes(x));

const tagsFor = (values: string[] = []) =>
  values.map((x) => TASTE_TAG_ALIAS[x] ?? x);

const CATEGORY_EQUIVALENTS: Record<string, string[]> = {
  烧烤: ["烧烤", "烤肉"],
  烤肉: ["烤肉", "烧烤"],
};

function expandCategories(values: string[]): string[] {
  return Array.from(
    new Set(values.flatMap((x) => CATEGORY_EQUIVALENTS[x] ?? [x]))
  );
}

function realPrefer(values: string[]): string[] {
  return values.filter((c) => c !== "都可以");
}

function consensusCategories(host: UserPreference, guest: UserPreference): string[] {
  const hostSet = new Set(expandCategories(realPrefer(host.preferCategories)));
  return expandCategories(realPrefer(guest.preferCategories)).filter((tag) =>
    hostSet.has(tag)
  );
}

function categoryConfidence(r: Restaurant, tag: string): number {
  const inferred = r.inferredCategories?.find((x) => x.tag === tag);
  if (inferred) return inferred.confidence;
  return r.categories.includes(tag) ? 1 : 0;
}

function tasteConfidence(r: Restaurant, tag: string): number {
  const inferred = r.inferredTasteTags?.find((x) => x.tag === tag);
  if (inferred) return inferred.confidence;
  return r.tags.includes(tag) ? 1 : 0;
}

function categoryHits(
  r: Restaurant,
  values: string[],
  threshold: number = C.confidence.softTaste
): string[] {
  return values.filter((tag) =>
    expandCategories([tag]).some(
      (candidate) => categoryConfidence(r, candidate) >= threshold
    )
  );
}

function tasteHits(
  r: Restaurant,
  values: string[],
  threshold: number = C.confidence.softTaste
): string[] {
  return tagsFor(values).filter((tag) => tasteConfidence(r, tag) >= threshold);
}

/** Hard Filter：命中任一方强烈底线则排除 */
export function passesHardFilter(r: Restaurant, u: UserPreference): boolean {
  // 0. 永远排除甜品/饮品店 & 食堂等非正餐场所
  if (categoryConfidence(r, "甜品") >= C.confidence.hardCategory) {
    return false;
  }
  if (categoryConfidence(r, "非正餐") >= C.confidence.hardCategory) {
    return false;
  }

  // 1. 品类黑名单
  if (
    categoryHits(r, expandCategories(u.avoidCategories), C.confidence.hardCategory)
      .length > 0
  ) {
    return false;
  }

  // 2. 口味黑名单：只用高置信标签硬排，弱证据留给软扣分
  if (tasteHits(r, u.avoidTaste, C.confidence.hardTaste).length > 0) {
    return false;
  }

  // 3. 评分底线：已知评分低于 3.5 的店不推荐
  if (r.rating != null && r.rating < C.rating.floor) return false;

  // 4. 价格上限（留一点缓冲）
  if (u.priceRange?.max != null && r.averagePrice != null) {
    if (r.averagePrice > u.priceRange.max * (1 + C.priceBufferRatio)) return false;
  }
  // 价格下限
  if (u.priceRange?.min != null && r.averagePrice != null) {
    if (r.averagePrice < u.priceRange.min * 0.6) return false;
  }

  // 5. 必须现在营业
  if (u.requireOpenNow && r.isOpen === false) return false;

  return true;
}

/**
 * 额外命中的边际加分：命中多个「想吃」标签时递减 + 封顶。
 * 主要靠「命不命中」和「置信度」拉开差距，而不是「命中几个标签」，
 * 避免标签多（含高度重叠的标签，如 米线→碳水+汤汤水水+热乎）的店堆分占优。
 * @param extraCount 额外命中数（= 命中总数 - 1）
 * @param unit 单位加分（extraHitBonus）
 */
function extraHitScore(extraCount: number, unit: number): number {
  if (extraCount <= 0) return 0;
  // 调和递减：第2个 +unit，第3个 +unit/2，第4个 +unit/3 …
  let sum = 0;
  for (let i = 1; i <= extraCount; i++) sum += unit / i;
  // 封顶：额外加分最多相当于 2 个单位，杜绝「堆标签」无限加分
  return Math.min(sum, unit * 2);
}

/** 单用户软偏好得分 0-100 */
export function computeUserScore(r: Restaurant, u: UserPreference): number {
  const cfg = C.userScore;
  let score = cfg.base;

  const anythingOk = u.preferCategories.includes("都可以");
  const categories = realPrefer(u.preferCategories);
  const catHits = categoryHits(r, categories, C.confidence.softTaste);
  const prefTasteHits = tasteHits(r, u.tastePreferences, C.confidence.softTaste);

  if (catHits.length > 0) {
    const best = Math.max(...catHits.map((tag) => categoryConfidence(r, tag)));
    score +=
      cfg.hitPreferCategory * best +
      extraHitScore(catHits.length - 1, cfg.extraHitBonus);
  } else if (anythingOk) {
    score += cfg.anythingOk;
  } else if (categories.length === 0 && u.tastePreferences.length === 0) {
    score += cfg.noPreferenceNeutral;
  } else if (categories.length > 0) {
    // 选了具体「想吃」品类却完全没命中 → 降分，
    // 让「对方想吃的店」明显优于「谁都不想吃的店」
    score -= cfg.missPreferCategory;
  }

  if (prefTasteHits.length > 0) {
    const best = Math.max(...prefTasteHits.map((tag) => tasteConfidence(r, tag)));
    score +=
      cfg.hitPreferTaste * best +
      extraHitScore(prefTasteHits.length - 1, cfg.extraHitBonus);
  }

  for (const avoid of tagsFor(u.avoidTaste)) {
    const confidence = tasteConfidence(r, avoid);
    if (confidence >= C.confidence.softTaste) {
      score -= (cfg.penalty[avoid] ?? 14) * confidence;
    }
  }

  // 软偏好：少油、少辣、尽量不要连锁
  for (const pref of u.preferenceTags ?? []) {
    const tag = TASTE_TAG_ALIAS[pref];
    const confidence = tag ? tasteConfidence(r, tag) : 0;
    if (tag && confidence >= C.confidence.softTaste) {
      score -= (cfg.penalty[tag] ?? 10) * confidence;
    }
  }

  if ((u.preferenceTags ?? []).includes("离近一些") || u.preferNearby) {
    if (r.distance != null && r.distance <= 1200) score += cfg.nearbyBonus;
  }

  // 评分高一点
  if (u.preferHighRating && r.rating != null) {
    const norm = normalizeRating(r.rating);
    score += (norm / 100) * cfg.highRatingBonus;
  }

  return clamp(score);
}

function normalizeRating(rating: number): number {
  const { floor, ceil } = C.rating;
  return clamp(((rating - floor) / (ceil - floor)) * 100);
}

function distanceScore(r: Restaurant, radius: number): number {
  if (r.distance == null) return 60;
  return clamp((1 - r.distance / Math.max(radius, 1)) * 100);
}

/** 双方匹配得分：保护满意度最低的一方 */
export function pairMatchScore(scoreA: number, scoreB: number): number {
  const min = Math.min(scoreA, scoreB);
  const avg = (scoreA + scoreB) / 2;
  return min * C.pair.minWeight + avg * C.pair.avgWeight;
}

interface Scored {
  restaurant: Restaurant;
  final: number;
  scoreA: number;
  scoreB: number;
}

/** 计算所有通过硬过滤的餐厅得分并排序 */
export function scoreRestaurants(
  input: RecommendInput,
  radius = 3000
): Scored[] {
  const { restaurants, host, guest, excludeIds = [] } = input;
  const excluded = new Set(excludeIds);

  const scored = restaurants
    .filter((r) => !excluded.has(r.id))
    .filter((r) => passesHardFilter(r, host) && passesHardFilter(r, guest))
    .map((r) => {
      const scoreA = computeUserScore(r, host);
      const scoreB = computeUserScore(r, guest);
      const pair = pairMatchScore(scoreA, scoreB);
      const quality = r.rating != null ? normalizeRating(r.rating) : 55;
      const dist = distanceScore(r, radius);
      const final =
        pair * C.finalWeights.pairMatch +
        quality * C.finalWeights.quality +
        dist * C.finalWeights.distance;
      return { restaurant: r, final, scoreA, scoreB };
    });

  // 优先池三级：
  // 1) 双方共同想吃的品类（有共识时最优先）
  // 2) 至少命中一方想吃的品类（无共识时，从「有人想吃」的店里折中，
  //    避免推荐谁都不想吃的店，如食堂）
  // 3) 全量（谁的偏好都没命中时才退回，例如两人想吃的品类附近都没有）
  const consensus = consensusCategories(host, guest);
  const consensusScored =
    consensus.length > 0
      ? scored.filter(
          (s) =>
            categoryHits(s.restaurant, consensus, C.confidence.reason).length > 0
        )
      : [];

  const eitherPrefer = Array.from(
    new Set([
      ...realPrefer(host.preferCategories),
      ...realPrefer(guest.preferCategories),
    ])
  );
  const eitherScored =
    eitherPrefer.length > 0
      ? scored.filter(
          (s) =>
            categoryHits(s.restaurant, eitherPrefer, C.confidence.reason).length >
            0
        )
      : [];

  const pool =
    consensusScored.length > 0
      ? consensusScored
      : eitherScored.length > 0
        ? eitherScored
        : scored;

  return pool.sort((a, b) => {
    if (b.final !== a.final) return b.final - a.final;
    const ratingA = a.restaurant.rating ?? 0;
    const ratingB = b.restaurant.rating ?? 0;
    if (ratingB !== ratingA) return ratingB - ratingA;
    const distA = a.restaurant.distance ?? Number.POSITIVE_INFINITY;
    const distB = b.restaurant.distance ?? Number.POSITIVE_INFINITY;
    return distA - distB;
  });
}

export function buildReason(
  r: Restaurant,
  host: UserPreference,
  guest: UserPreference,
  radius: number
): RecommendReason {
  const hostPrefer = host.preferCategories.filter((c) => c !== "都可以");
  const guestPrefer = guest.preferCategories.filter((c) => c !== "都可以");
  const hostTastes = tagsFor(host.tastePreferences);
  const guestTastes = tagsFor(guest.tastePreferences);

  let bothWant = categoryHits(
    r,
    intersect(hostPrefer, guestPrefer),
    C.confidence.reason
  );
  let categoryMatchScope: "both" | "either" = "both";
  if (bothWant.length === 0) {
    // 退而求其次：至少有一方想吃
    bothWant = categoryHits(r, [...hostPrefer, ...guestPrefer], C.confidence.reason);
    categoryMatchScope = "either";
  }

  let matchedTastes = tasteHits(
    r,
    intersect(hostTastes, guestTastes),
    C.confidence.reason
  );
  let tasteMatchScope: "both" | "either" = "both";
  if (matchedTastes.length === 0) {
    matchedTastes = tasteHits(r, [...hostTastes, ...guestTastes], C.confidence.reason);
    tasteMatchScope = "either";
  }

  const avoided = Array.from(
    new Set([
      ...host.avoidCategories,
      ...guest.avoidCategories,
      ...tagsFor(host.avoidTaste),
      ...tagsFor(guest.avoidTaste),
    ])
  ).slice(0, 3);

  const extra: string[] = [];
  if (r.rating != null && r.rating >= 4.4) extra.push("评分不错");
  if (r.distance != null && r.distance <= Math.min(radius, 1200))
    extra.push("距离不远");
  if (r.isOpen) extra.push("正在营业");

  return {
    bothWant: bothWant.slice(0, 3),
    categoryMatchScope,
    matchedTastes: matchedTastes.slice(0, 3),
    tasteMatchScope,
    avoided,
    extra,
  };
}

/**
 * 推荐引擎主入口。
 * 流程：Hard Filter → 共识品类优先 → Soft Score → Pair Match → Quality → Distance → 最高分第一。
 * 返回 null 表示没有任何满足条件的候选（Zero Result）。
 */
export function recommend(
  input: RecommendInput,
  radius = 3000
): RecommendResult | null {
  const scored = scoreRestaurants(input, radius);
  if (scored.length === 0) return null;

  const picked = scored[0];

  return {
    restaurant: picked.restaurant,
    reason: buildReason(picked.restaurant, input.host, input.guest, radius),
    remaining: scored.length,
  };
}
