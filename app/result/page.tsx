"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RestaurantCardStack,
  type StackItem,
} from "@/features/recommendation/RestaurantCardStack";
import { ensureRestaurants, computeTop } from "@/features/matching/recommendation-client";
import { getRoomRepository } from "@/lib/room/repository";
import {
  buildReason,
  buildReasonTag,
  recommendTop,
} from "@/lib/recommendation-engine";
import { track } from "@/lib/analytics";
import { RADIUS_OPTIONS } from "@/config/options";
import type { DiningRoom, Restaurant } from "@/types";

type ZeroReason = "no_restaurants" | "filtered";

/**
 * 结果页背景两个模糊圆（还原设计稿，画板基准 393×852）。
 * 下层：582×620 粉红 #FF6B7A 50%，blur 62.2，left -85 / top -226
 * 上层：582×594 橙色渐变 #FF3E17→#FF7033，blur 71.05，left -85 / top -316
 */
function ResultGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 下层：粉红 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 582,
          height: 620,
          left: -85,
          top: -226,
          background: "rgba(255,107,122,0.5)",
          filter: "blur(62.2px)",
        }}
      />
      {/* 上层：橙色渐变 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 582,
          height: 594,
          left: -85,
          top: -316,
          background: "linear-gradient(180deg,#FF3E17 23%,#FF7033 73%)",
          filter: "blur(71.05px)",
        }}
      />
    </div>
  );
}

function ResultInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? "";
  const role = params.get("role") ?? "host";

  const [room, setRoom] = useState<DiningRoom | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<StackItem[]>([]);
  const [topId, setTopId] = useState("");
  const [loading, setLoading] = useState(true);
  const [zeroResult, setZeroResult] = useState(false);
  const [zeroReason, setZeroReason] = useState<ZeroReason>("filtered");
  const inited = useRef(false);

  const handleTopChange = useCallback((id: string) => setTopId(id), []);

  const toItems = (
    list: { restaurant: Restaurant; reason: ReturnType<typeof buildReason> }[]
  ): StackItem[] =>
    list.map((x) => ({
      restaurant: x.restaurant,
      reasonTag: buildReasonTag(x.reason),
    }));

  useEffect(() => {
    if (!roomId || inited.current) return;
    inited.current = true;
    (async () => {
      const repo = getRoomRepository();
      const r = await repo.getRoom(roomId);
      if (!r) {
        router.replace("/");
        return;
      }
      setRoom(r);

      const { restaurants: list } = await ensureRestaurants(r);
      setRestaurants(list);

      // 优先复用房间里已存的 3 家（保证双方看到同样的候选）
      const stored = r.recommendedRestaurantIds ?? [];
      let results = computeTop(r, list, 3);
      if (stored.length >= 3 && r.hostPreference && r.guestPreference) {
        const mapped = stored
          .slice(0, 3)
          .map((id) => list.find((x) => x.id === id))
          .filter((x): x is Restaurant => !!x);
        if (mapped.length === 3) {
          results = mapped.map((rest) => ({
            restaurant: rest,
            reason: buildReason(rest, r.hostPreference!, r.guestPreference!, r.radius),
            remaining: 3,
          }));
        }
      }

      if (results.length === 0) {
        setZeroReason(list.length === 0 ? "no_restaurants" : "filtered");
        setZeroResult(true);
        track("zero_result");
      } else {
        setItems(toItems(results));
        setTopId(results[0].restaurant.id);
        track("restaurant_shown", { id: results[0].restaurant.id });
        await repo.updateRoom(r.id, {
          recommendedRestaurantIds: results.map((x) => x.restaurant.id),
          status: "result",
        });
      }
      setLoading(false);
    })();
  }, [roomId, router]);

  /** 决定了 → 选中当前最上面那张 */
  const decide = async () => {
    if (!room || !topId) return;
    const repo = getRoomRepository();
    await repo.updateRoom(room.id, {
      status: "completed",
      selectedRestaurantId: topId,
    });
    track("restaurant_selected", { id: topId });
    router.push(`/done?room=${room.id}&role=${role}`);
  };

  /** 放宽「坚决不吃」与价格后重试 */
  const relax = () => {
    if (!room?.hostPreference || !room.guestPreference) return;
    const strip = (p: NonNullable<DiningRoom["hostPreference"]>) => ({
      ...p,
      avoidCategories: [],
      avoidTaste: [],
      priceRange: undefined,
    });
    const results = recommendTop(
      {
        restaurants,
        host: strip(room.hostPreference),
        guest: strip(room.guestPreference),
      },
      room.radius,
      3
    );
    if (results.length > 0) {
      setItems(toItems(results));
      setTopId(results[0].restaurant.id);
      setZeroResult(false);
    }
  };

  /** 扩大搜索范围后重试 */
  const widen = async () => {
    if (!room) return;
    const cur = RADIUS_OPTIONS.findIndex((o) => o.value === room.radius);
    const next = RADIUS_OPTIONS[cur + 1];
    if (!next) return;
    const repo = getRoomRepository();
    if (typeof window !== "undefined")
      window.sessionStorage.removeItem(`jcz:restaurants:v3:${room.id}`);
    const updated = await repo.updateRoom(room.id, { radius: next.value });
    if (!updated) return;
    setRoom(updated);
    const { restaurants: list } = await ensureRestaurants(updated);
    setRestaurants(list);
    const results = computeTop(updated, list, 3);
    if (results.length > 0) {
      setItems(toItems(results));
      setTopId(results[0].restaurant.id);
      setZeroResult(false);
    } else {
      setZeroReason(list.length === 0 ? "no_restaurants" : "filtered");
      setZeroResult(true);
    }
  };

  if (loading)
    return <div className="min-h-[100dvh] bg-[#F6F6F6]" />;

  // Zero Result
  if (zeroResult) {
    const title =
      zeroReason === "no_restaurants" ? "附近没拿到餐厅" : "条件把候选筛光了";
    const text =
      zeroReason === "no_restaurants"
        ? "这一带没有返回可用的餐厅，可以扩大范围或换个位置。"
        : "「坚决不吃」、价格或营业要求筛掉了全部候选。";
    return (
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#F6F6F6]">
        <ResultGlow />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-9 text-center">
          <div className="text-[44px]">👀</div>
          <h1 className="mt-4 text-[24px] font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-[14px] text-[#6A6A6A]">{text}</p>
        </div>
        <div
          className="relative z-10 shrink-0 px-9 pt-[26px]"
          style={{ paddingBottom: "calc(26px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={relax}
            className="press mb-3 flex h-[56px] w-full items-center justify-center rounded-full bg-[#1F1F1F] text-[18px] font-medium text-white active:opacity-90"
          >
            放宽「坚决不吃」
          </button>
          <button
            onClick={widen}
            className="press mb-3 flex h-[56px] w-full items-center justify-center rounded-full border border-line bg-white text-[18px] font-medium text-[#6A6A6A] active:bg-line/40"
          >
            扩大搜索范围
          </button>
          <button
            onClick={() => router.replace("/")}
            className="press flex h-[44px] w-full items-center justify-center text-[14px] text-[#6A6A6A]"
          >
            重新开始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#F6F6F6]">
      <ResultGlow />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* 头部 */}
        <div
          className="shrink-0 px-9 pb-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}
        >
          <div className="text-[48px] font-semibold leading-[1.4]">🍽</div>
          <h1
            className="mt-[9px] text-[24px] font-semibold text-white"
            style={{ textShadow: "0px 0px 12px rgba(209,71,11,1)" }}
          >
            待会就吃…
          </h1>
        </div>

        {/* 卡片堆 */}
        <div className="flex min-h-0 flex-1 items-center px-8">
          <RestaurantCardStack items={items} onTopChange={handleTopChange} />
        </div>

        {/* 底部 */}
        <div
          className="shrink-0 px-9 pt-[26px]"
          style={{ paddingBottom: "calc(26px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={decide}
            className="press flex w-full items-center justify-center rounded-[54px] bg-[#1F1F1F] px-[31px] py-4 text-[18px] font-medium text-white active:opacity-90"
          >
            决定了！
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F6F6F6]" />}>
      <ResultInner />
    </Suspense>
  );
}
