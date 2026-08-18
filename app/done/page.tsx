"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/Button";
import { BottomAction } from "@/components/BottomAction";
import { BottomSheet } from "@/components/BottomSheet";
import { ensureRestaurants } from "@/features/matching/recommendation-client";
import { getRoomRepository } from "@/lib/room/repository";
import { formatDistance } from "@/lib/geo";
import type { Restaurant } from "@/types";

function DoneInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? "";
  const [r, setR] = useState<Restaurant | null>(null);
  const [info, setInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const repo = getRoomRepository();
      const room = await repo.getRoom(roomId);
      if (!room) {
        router.replace("/");
        return;
      }
      const { restaurants } = await ensureRestaurants(room);
      setR(restaurants.find((x) => x.id === room.selectedRestaurantId) ?? null);
      setLoading(false);
    })();
  }, [roomId, router]);

  const openMap = () => {
    if (!r) return;
    const { lat, lng } = r.location;
    const url = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(
      r.name
    )}&src=jiuchizhege&coordinate=gaode&callnative=1`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="min-h-[100dvh] bg-cream" />;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <AppBar onBack={() => router.replace("/")} />

      <div className="flex flex-1 flex-col justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="text-5xl">🎉</div>
          <h1 className="mt-4 text-display text-ink">就这么定了。</h1>
        </motion.div>

        {r && (
          <div className="mt-6 overflow-hidden rounded-3xl bg-surface shadow-card">
            {r.photos?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.photos[0]}
                alt={r.name}
                className="aspect-[16/9] w-full object-cover"
              />
            )}
            <div className="px-5 py-4">
              <h2 className="text-title text-ink">{r.name}</h2>
              <p className="mt-1 text-[15px] text-ink-soft">
                {r.categories.join(" · ")} · {formatDistance(r.distance)}
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomAction tone="cream">
        <Button onClick={openMap}>去这里</Button>
        <Button variant="ghost" onClick={() => setInfo(true)}>
          查看店铺信息
        </Button>
      </BottomAction>

      <BottomSheet open={info} onClose={() => setInfo(false)} title={r?.name}>
        {r && (
          <div className="space-y-2.5 text-[15px] text-ink-soft">
            {r.address && (
              <div>
                地址：<span className="text-ink">{r.address}</span>
              </div>
            )}
            {r.rating != null && (
              <div>
                评分：<span className="text-ink">⭐ {r.rating.toFixed(1)}</span>
              </div>
            )}
            {r.averagePrice != null && (
              <div>
                人均：<span className="text-ink">¥{r.averagePrice}</span>
              </div>
            )}
            {r.businessHours && (
              <div>
                营业：<span className="text-ink">{r.businessHours}</span>
              </div>
            )}
            {r.distance != null && (
              <div>
                距离：<span className="text-ink">{formatDistance(r.distance)}</span>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <DoneInner />
    </Suspense>
  );
}
