"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/Button";
import { useRoom } from "@/features/room/useRoom";
import { getRoomRepository } from "@/lib/room/repository";
import { track } from "@/lib/analytics";
import { RADIUS_OPTIONS } from "@/config/options";

function InviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? undefined;
  const { room, loading } = useRoom(roomId);

  const guestDone = !!room?.guestPreference;

  // 双方都填好 → 进入匹配
  useEffect(() => {
    if (room && guestDone) {
      const repo = getRoomRepository();
      if (room.status === "waiting") {
        repo.updateRoom(room.id, { status: "matching" });
      }
      track("both_ready", { roomId: room.id });
      const t = setTimeout(
        () => router.push(`/matching?room=${room.id}&role=host`),
        700
      );
      return () => clearTimeout(t);
    }
  }, [room, guestDone, router]);

  if (loading) return <div className="min-h-[100dvh] bg-cream" />;
  if (!room)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-cream px-6">
        <p className="text-ink-soft">这个饭局链接失效了</p>
        <Button full={false} onClick={() => router.replace("/")}>
          回到首页
        </Button>
      </div>
    );

  const radiusLabel =
    RADIUS_OPTIONS.find((o) => o.value === room.radius)?.label ?? `${room.radius}m`;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <AppBar back={false} />

      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="text-center">
          <div className="text-[40px] leading-none">⏳</div>
          <h1 className="mt-3 text-[24px] font-extrabold text-ink">
            {guestDone ? "都选好啦，马上开始" : "你选好啦，等 TA 一下"}
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {guestDone ? "正在帮你们拍板…" : "对方填完偏好后自动开始推荐"}
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-surface px-5 py-4 text-[15px] shadow-warm">
          <div>
            地点：<span className="font-semibold text-ink">{room.location.name}</span>
          </div>
          <div className="mt-1.5">
            范围：<span className="font-semibold text-ink">{radiusLabel}</span>
          </div>
        </div>

        {/* 双方状态 */}
        <div className="mt-4 rounded-3xl bg-surface px-5 py-4 shadow-warm">
          <StatusRow label="你" done />
          <StatusRow label="TA" done={guestDone} pending={!guestDone} />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  done,
  pending,
}: {
  label: string;
  done?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <motion.span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          done ? "bg-success text-white" : "border-2 border-line text-transparent"
        }`}
        animate={pending ? { scale: [1, 1.15, 1] } : undefined}
        transition={pending ? { duration: 1.2, repeat: Infinity } : undefined}
      >
        {done ? "✓" : "○"}
      </motion.span>
      <span className="font-medium text-ink">{label}</span>
      <span className="ml-auto text-sm text-ink-faint">
        {done ? "已完成" : "填写中…"}
      </span>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <InviteInner />
    </Suspense>
  );
}
