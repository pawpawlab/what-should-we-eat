"use client";

import { motion } from "framer-motion";
import type { Restaurant } from "@/types";
import { formatDistance } from "@/lib/geo";
import type { RecommendReason } from "@/lib/recommendation-engine";

/** 大尺寸推荐餐厅卡片 */
export function RestaurantCard({ r }: { r: Restaurant }) {
  const photo = r.photos?.[0];
  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-card">
      <div className="relative aspect-[4/3] w-full bg-line">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={r.name}
            className="h-full w-full object-cover"
            loading="eager"
          />
        )}
        {r.isOpen && (
          <span className="absolute left-3 top-3 rounded-bubble bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            营业中
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        <h2 className="text-title text-ink">{r.name}</h2>
        <div className="mt-2 flex items-center gap-4 text-[15px] text-ink-soft">
          {r.rating != null && (
            <span className="font-semibold text-ink">⭐ {r.rating.toFixed(1)}</span>
          )}
          {r.averagePrice != null && <span>¥{r.averagePrice}/人</span>}
          {r.distance != null && <span>{formatDistance(r.distance)}</span>}
        </div>
        <p className="mt-1.5 text-sm text-ink-faint">
          {r.categories.join(" · ")}
        </p>
      </div>
    </div>
  );
}

/** 推荐理由（简短、不暴露算法分数） */
export function ReasonBlock({ reason }: { reason: RecommendReason }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-4 rounded-2xl bg-surface px-5 py-4 shadow-card"
    >
      <p className="text-sm font-semibold text-ink-faint">为什么是它？</p>
      <div className="mt-3 space-y-3 text-[15px]">
        {reason.bothWant.length > 0 && (
          <div>
            <span className="text-ink-soft">
              {reason.categoryMatchScope === "both" ? "你们都想吃：" : "有人想吃："}
            </span>
            <span className="font-semibold text-ink">
              🔥 {reason.bothWant.join(" · ")}
            </span>
          </div>
        )}
        {reason.matchedTastes.length > 0 && (
          <div>
            <span className="text-ink-soft">
              {reason.tasteMatchScope === "both" ? "口味都合适：" : "口味也合适："}
            </span>
            <span className="font-semibold text-ink">
              {reason.matchedTastes.join(" · ")}
            </span>
          </div>
        )}
        {reason.avoided.length > 0 && (
          <div>
            <span className="text-ink-soft">帮你们避开了：</span>
            <span className="font-medium text-ink">
              {reason.avoided.join(" · ")}
            </span>
          </div>
        )}
        {reason.extra.length > 0 && (
          <div>
            <span className="text-ink-soft">而且：</span>
            <span className="font-medium text-ink">
              {reason.extra.join(" · ")}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
