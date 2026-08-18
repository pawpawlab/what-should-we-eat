"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/Button";
import { BottomAction } from "@/components/BottomAction";
import { BottomSheet } from "@/components/BottomSheet";
import { RestaurantCard, ReasonBlock } from "@/features/recommendation/RestaurantCard";
import { ensureRestaurants } from "@/features/matching/recommendation-client";
import { getRoomRepository } from "@/lib/room/repository";
import {
  recommend,
  buildReason,
  passesHardFilter,
  RECOMMEND_CONFIG,
  type RecommendReason,
} from "@/lib/recommendation-engine";
import { track } from "@/lib/analytics";
import { RADIUS_OPTIONS } from "@/config/options";
import type { DiningRoom, Restaurant } from "@/types";

const SWAP_MESSAGES = [
  "好，再换一家。",
  "看来这家也不行。",
  "你们要求还挺高 👀",
];

type ZeroReason = "no_restaurants" | "filtered";

/** “换一个”最多次数 */
const MAX_SWAPS = 2;

function ResultInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? "";
  const role = params.get("role") ?? "host";

  const [room, setRoom] = useState<DiningRoom | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [current, setCurrent] = useState<Restaurant | null>(null);
  const [reason, setReason] = useState<RecommendReason | null>(null);
  const [remaining, setRemaining] = useState<number>(99);
  const [swapCount, setSwapCount] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [zeroResult, setZeroResult] = useState(false);
  const [zeroReason, setZeroReason] = useState<ZeroReason>("filtered");
  const [lowSheet, setLowSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const inited = useRef(false);

  const threshold = RECOMMEND_CONFIG.candidate.lowRemainingThreshold;
  const swapLeft = Math.max(0, MAX_SWAPS - swapCount);

  const countRemaining = (list: Restaurant[], r: DiningRoom) =>
    list.filter(
      (x) =>
        !r.rejectedRestaurantIds.includes(x.id) &&
        r.hostPreference &&
        r.guestPreference &&
        passesHardFilter(x, r.hostPreference) &&
        passesHardFilter(x, r.guestPreference)
    ).length;

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

      const curId = r.recommendedRestaurantIds.at(-1);
      let cur = list.find((x) => x.id === curId) ?? null;
      let nextRoom = r;
      const bothReady = !!(r.hostPreference && r.guestPreference);
      if (!cur && bothReady) {
        const rec = recommend(
          {
            restaurants: list,
            host: r.hostPreference!,
            guest: r.guestPreference!,
            excludeIds: r.rejectedRestaurantIds,
          },
          r.radius
        );
        if (rec) {
          cur = rec.restaurant;
          const updated = await repo.updateRoom(r.id, {
            recommendedRestaurantIds: [
              ...r.recommendedRestaurantIds,
              rec.restaurant.id,
            ],
            status: "result",
          });
          nextRoom = updated ?? r;
        }
      }
      if (cur && bothReady) {
        setRoom(nextRoom);
        setCurrent(cur);
        setReason(buildReason(cur, r.hostPreference!, r.guestPreference!, r.radius));
        setRemaining(countRemaining(list, nextRoom));
        // 已“换一个”的次数 = 已拒绝数量（刷新后不会重置，仍受 MAX_SWAPS 限制）
        setSwapCount(nextRoom.rejectedRestaurantIds.length);
      } else {
        setZeroReason(list.length === 0 ? "no_restaurants" : "filtered");
        setZeroResult(true);
        track("zero_result");
      }
      setLoading(false);
    })();
  }, [roomId, router]);

  const swap = async () => {
    if (!room || !current) return;
    if (swapLeft <= 0) return; // 换的次数用完
    const repo = getRoomRepository();
    const rejected = [...room.rejectedRestaurantIds, current.id];
    track("restaurant_rejected", { id: current.id });

    const rec = recommend(
      {
        restaurants,
        host: room.hostPreference!,
        guest: room.guestPreference!,
        excludeIds: rejected,
      },
      room.radius
    );

    if (!rec) {
      const updated = await repo.updateRoom(room.id, {
        rejectedRestaurantIds: rejected,
      });
      if (updated) setRoom(updated);
      setLowSheet(true);
      return;
    }

    const updated = await repo.updateRoom(room.id, {
      rejectedRestaurantIds: rejected,
      recommendedRestaurantIds: [...room.recommendedRestaurantIds, rec.restaurant.id],
    });
    if (updated) setRoom(updated);

    setCurrent(rec.restaurant);
    setReason(rec.reason);
    setRemaining(rec.remaining);
    const n = swapCount;
    setSwapCount(n + 1);
    // 换到最后一次时提示次数用完，否则轮播文案
    const leftAfter = MAX_SWAPS - (n + 1);
    setBanner(
      leftAfter <= 0
        ? "这是最后一次啦，就它了吧～"
        : SWAP_MESSAGES[Math.min(n, SWAP_MESSAGES.length - 1)]
    );
    setTimeout(() => setBanner(null), 1800);
    track("restaurant_shown", { id: rec.restaurant.id });

    if (rec.remaining <= threshold) setLowSheet(true);
  };

  const confirm = async () => {
    if (!room || !current) return;
    const repo = getRoomRepository();
    await repo.updateRoom(room.id, {
      status: "completed",
      selectedRestaurantId: current.id,
    });
    track("restaurant_selected", { id: current.id });
    router.push(`/done?room=${room.id}&role=${role}`);
  };

  // 放宽“不想吃” → 去掉黑名单与价格上限后重试
  const relax = async () => {
    if (!room) return;
    setLowSheet(false);
    const relaxedHost = {
      ...room.hostPreference!,
      avoidCategories: [],
      avoidTaste: [],
      priceRange: undefined,
    };
    const relaxedGuest = {
      ...room.guestPreference!,
      avoidCategories: [],
      avoidTaste: [],
      priceRange: undefined,
    };
    const rec = recommend(
      {
        restaurants,
        host: relaxedHost,
        guest: relaxedGuest,
        excludeIds: room.rejectedRestaurantIds,
      },
      room.radius
    );
    if (rec) {
      setCurrent(rec.restaurant);
      setReason(rec.reason);
      setRemaining(rec.remaining);
      setZeroResult(false);
      setBanner("放宽了点条件，再看看这家");
      setTimeout(() => setBanner(null), 1800);
    } else {
      setZeroReason(restaurants.length === 0 ? "no_restaurants" : "filtered");
      setZeroResult(true);
    }
  };

  // 扩大搜索范围
  const widen = async () => {
    if (!room) return;
    const cur = RADIUS_OPTIONS.findIndex((o) => o.value === room.radius);
    const nextOpt = RADIUS_OPTIONS[cur + 1];
    if (!nextOpt) {
      setBanner("已经是最大范围啦");
      setTimeout(() => setBanner(null), 1800);
      return;
    }
    setLowSheet(false);
    const repo = getRoomRepository();
    if (typeof window !== "undefined")
      window.sessionStorage.removeItem(`jcz:restaurants:v3:${room.id}`);
    const updated = await repo.updateRoom(room.id, { radius: nextOpt.value });
    if (!updated) return;
    setRoom(updated);
    const { restaurants: list } = await ensureRestaurants(updated);
    setRestaurants(list);
    const rec = recommend(
      {
        restaurants: list,
        host: updated.hostPreference!,
        guest: updated.guestPreference!,
        excludeIds: updated.rejectedRestaurantIds,
      },
      updated.radius
    );
    if (rec) {
      await repo.updateRoom(updated.id, {
        recommendedRestaurantIds: [...updated.recommendedRestaurantIds, rec.restaurant.id],
      });
      setCurrent(rec.restaurant);
      setReason(rec.reason);
      setRemaining(rec.remaining);
      setZeroResult(false);
      setBanner(`范围扩大到 ${nextOpt.label}`);
      setTimeout(() => setBanner(null), 1800);
    } else {
      setZeroReason(list.length === 0 ? "no_restaurants" : "filtered");
      setZeroResult(true);
    }
  };

  const restart = () => {
    router.replace("/");
  };

  if (loading)
    return <div className="min-h-[100dvh] bg-gradient-to-b from-[#F6A46A] to-cream" />;

  const zeroTitle =
    zeroReason === "no_restaurants" ? "附近没拿到餐厅" : "硬条件把候选筛光了";
  const zeroText =
    zeroReason === "no_restaurants"
      ? "高德这次没有返回真实餐厅，可以扩大范围或换个位置。"
      : "想吃没有重合也会折中推荐；这里主要是“坚决不吃”、价格或营业要求筛掉了候选。";

  // Zero Result / 全部候选用完
  if (zeroResult && !current) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-[#F6A46A] to-cream">
        <AppBar onBack={() => router.replace("/")} transparent />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl">👀</div>
          <h1 className="mt-4 text-title text-ink">{zeroTitle}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            {zeroText}
          </p>
        </div>
        <BottomAction tone="cream">
          <Button onClick={relax}>放宽“不想吃”</Button>
          <Button variant="secondary" onClick={widen}>
            扩大搜索范围
          </Button>
          <Button variant="ghost" onClick={restart}>
            重新选口味
          </Button>
        </BottomAction>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-[#F6A46A] to-cream">
      <AppBar onBack={() => router.replace("/")} transparent />

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        <p className="mb-3 text-center text-[15px] font-medium text-ink/70">
          今晚就吃这个
        </p>

        <div className="relative min-h-[60px]">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <RestaurantCard r={current} />
                {reason && <ReasonBlock reason={reason} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {remaining <= threshold && (
          <p className="mt-4 text-center text-sm text-ink-faint">
            附近比较符合你们要求的，快被挑完了。
          </p>
        )}

        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed left-1/2 top-16 z-30 -translate-x-1/2 rounded-bubble bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              {banner}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomAction tone="cream">
        <Button onClick={confirm}>就它了</Button>
        <Button variant="ghost" onClick={swap} disabled={swapLeft <= 0}>
          {swapLeft > 0 ? `换一个 (剩${swapLeft}次)` : "换的次数用完了"}
        </Button>
      </BottomAction>

      <BottomSheet
        open={lowSheet}
        onClose={() => setLowSheet(false)}
        title="附近的选择不多了"
      >
        <p className="text-[15px] text-ink-soft">
          符合你们要求的店快挑完了，可以放宽一下或者换个范围。
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Button onClick={relax}>放宽“不想吃”</Button>
          <Button variant="secondary" onClick={widen}>
            扩大搜索范围
          </Button>
          <Button variant="ghost" onClick={restart}>
            重新选口味
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <ResultInner />
    </Suspense>
  );
}
