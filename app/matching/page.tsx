"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { getRoomRepository } from "@/lib/room/repository";
import { ensureRestaurants, computeNext } from "@/features/matching/recommendation-client";
import { track } from "@/lib/analytics";

const MESSAGES = [
  "看看你们今天有没有默契",
  "正在排除你们都不想吃的",
  "附近翻翻有什么",
  "马上帮你们拍板",
];

function MatchingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? undefined;
  const role = params.get("role") ?? "host";
  const [msgIdx, setMsgIdx] = useState(0);
  const started = useRef(false);

  // 文案轮播
  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx((i) => (i + 1) % MESSAGES.length),
      1100
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!roomId || started.current) return;
    started.current = true;

    const run = async () => {
      const t0 = Date.now();
      const repo = getRoomRepository();

      // 等待双方偏好都就绪（另一方可能还在填），最多轮询 ~30s
      let room = await repo.getRoom(roomId);
      let tries = 0;
      while (
        room &&
        (!room.hostPreference || !room.guestPreference) &&
        tries < 40
      ) {
        await new Promise((r) => setTimeout(r, 800));
        room = await repo.getRoom(roomId);
        tries += 1;
      }

      if (!room) {
        router.replace("/");
        return;
      }
      track("match_started", { roomId });

      const { restaurants } = await ensureRestaurants(room);

      if (
        room.recommendedRestaurantIds.length === 0 &&
        room.hostPreference &&
        room.guestPreference
      ) {
        const rec = computeNext(room, restaurants);
        if (rec) {
          await repo.updateRoom(room.id, {
            recommendedRestaurantIds: [rec.restaurant.id],
            status: "result",
          });
          track("restaurant_shown", { id: rec.restaurant.id });
        } else {
          await repo.updateRoom(room.id, { status: "result" });
          track("zero_result");
        }
      } else {
        await repo.updateRoom(room.id, { status: "result" });
      }

      // 保证 Loading 视觉连续性（至少 ~1s）
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, 1000 - elapsed);
      setTimeout(
        () => router.replace(`/result?room=${roomId}&role=${role}`),
        wait
      );
    };

    run();
  }, [roomId, role, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-cream px-8">
      <div className="relative flex h-28 items-center justify-center">
        <motion.div
          className="absolute h-16 w-16 rounded-full bg-accent"
          animate={{ x: [-34, 0, -34] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute h-16 w-16 rounded-full border-4 border-ink bg-surface"
          animate={{ x: [34, 0, 34] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 text-center text-lg font-medium text-ink-soft"
      >
        {MESSAGES[msgIdx]}
      </motion.p>
    </div>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <MatchingInner />
    </Suspense>
  );
}
