"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Restaurant } from "@/types";
import { formatDistance } from "@/lib/geo";

export interface StackItem {
  restaurant: Restaurant;
  /** 简短推荐理由，展示在卡片右上角胶囊里 */
  reasonTag: string;
}

/**
 * 卡片堆各层位置（按设计稿包围盒反推：越靠后的卡片略微上移、旋转更多）。
 * depth 0 = 最上面那张。
 */
const DEPTH = [
  { x: 0, y: 0, rotate: 0 },
  { x: -4, y: -6, rotate: -2 },
  { x: -1, y: -11, rotate: 3.5 },
];

const CARD_SHADOW =
  "0px 0px 1px 0px rgba(0,0,0,0.25), 0px 1px 13px 0px rgba(0,0,0,0.06)";

/** 单张餐厅卡片（照片 + 白色信息面板 + 理由胶囊） */
function Card({ item }: { item: StackItem }) {
  const r = item.restaurant;
  const photo = r.photos?.[0];

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[28px] border-4 border-white bg-white"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* 照片铺满整张卡片（底部被白色信息面板压住，形成层叠感） */}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={r.name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="eager"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg,#FFD9B8 0%,#FFB98F 55%,#FF9E6B 100%)",
          }}
        />
      )}

      {/* 推荐理由胶囊（卡片内部右上角） */}
      <span className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-[14px] leading-[1.4] text-white backdrop-blur-sm">
        {item.reasonTag}
      </span>

      {/* 白色信息面板：绝对定位压在照片上（设计稿 gap -30 的层叠效果） */}
      <div className="absolute inset-x-0 bottom-0 rounded-[28px] bg-white p-6">
        <h2 className="truncate text-[24px] font-medium leading-[1.4] text-black">
          {r.name}
        </h2>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="flex flex-1 items-center gap-1">
            <span className="text-[18px] leading-[1.4]">⭐</span>
            <span className="text-[14px] leading-[1.4] text-[#6A6A6A]">
              {r.rating != null ? r.rating.toFixed(1) : "—"}
            </span>
          </span>
          <span className="flex flex-1 items-center gap-1">
            <span className="text-[18px] leading-[1.4]">💰</span>
            <span className="text-[14px] leading-[1.4] text-[#6A6A6A]">
              {r.averagePrice != null ? `￥${r.averagePrice}` : "—"}
            </span>
          </span>
          <span className="flex flex-1 items-center gap-1">
            <span className="text-[18px] leading-[1.4]">🚶</span>
            <span className="text-[14px] leading-[1.4] text-[#6A6A6A]">
              {r.distance != null ? formatDistance(r.distance) : "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 餐厅卡片堆：展示 3 个候选。
 * 左滑或右滑最上面那张 → 水平滑开 → 再水平滑回到堆的最下方，露出下一张。
 */
export function RestaurantCardStack({
  items,
  onTopChange,
}: {
  items: StackItem[];
  /** 顶部卡片变化时回调（用于「决定了」按钮知道选的是哪家） */
  onTopChange?: (restaurantId: string) => void;
}) {
  // order[0] 是最上面那张
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  const [flying, setFlying] = useState<number | null>(null);
  const [flyDir, setFlyDir] = useState(0);

  // items 变化（换了候选）时重置顺序
  useEffect(() => {
    setOrder(items.map((_, i) => i));
    setFlying(null);
    setFlyDir(0);
  }, [items]);

  const topId = items[order[0]]?.restaurant.id;
  useEffect(() => {
    if (topId) onTopChange?.(topId);
  }, [topId, onTopChange]);

  const cycle = (dir: number) => {
    if (items.length < 2 || flying !== null) return;
    const top = order[0];
    setFlyDir(dir);
    setFlying(top);
    // 先水平滑开，再把它挪到堆底（滑回最下方）
    window.setTimeout(() => {
      setOrder((o) => [...o.slice(1), o[0]]);
      setFlying(null);
      setFlyDir(0);
    }, 230);
  };

  return (
    <div className="relative aspect-[329/410] w-full">
      {order.map((itemIdx, depth) => {
        const item = items[itemIdx];
        if (!item) return null;
        const isFront = depth === 0;
        const isFlying = flying === itemIdx;
        const pos = DEPTH[Math.min(depth, DEPTH.length - 1)];

        return (
          <motion.div
            key={item.restaurant.id}
            className="absolute inset-0"
            style={{ zIndex: items.length - depth }}
            drag={isFront && flying === null ? "x" : false}
            dragElastic={0.55}
            onDragEnd={(_, info) => {
              if (
                Math.abs(info.offset.x) > 90 ||
                Math.abs(info.velocity.x) > 500
              ) {
                cycle(info.offset.x > 0 ? 1 : -1);
              }
            }}
            animate={{
              x: isFlying ? flyDir * 460 : pos.x,
              y: isFlying ? 0 : pos.y,
              rotate: isFlying ? flyDir * 6 : pos.rotate,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <Card item={item} />
          </motion.div>
        );
      })}
    </div>
  );
}
