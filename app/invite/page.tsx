"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GlowBackground } from "@/components/GlowBackground";
import { useRoom } from "@/features/room/useRoom";
import { getRoomRepository } from "@/lib/room/repository";
import { track } from "@/lib/analytics";
import { RADIUS_OPTIONS } from "@/config/options";
import type { Role } from "@/types";

/** 一行完成状态：✓ 已完成 / ○ 填写中… */
function StatusRow({
  label,
  done,
  last,
}: {
  label: string;
  done: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${last ? "" : "mb-4"}`}>
      {done ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-[14px] text-white">
          ✓
        </span>
      ) : (
        <motion.span
          className="h-7 w-7 shrink-0 rounded-full border-2 border-line"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="text-[16px] text-ink">{label}</span>
      <span className="ml-auto text-[14px] text-[#6A6A6A]">
        {done ? "已完成" : "填写中…"}
      </span>
    </div>
  );
}

function WaitingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? undefined;
  const role = (params.get("role") as Role) ?? "host";
  const { room, loading } = useRoom(roomId);
  const jumped = useRef(false);

  const hostDone = !!room?.hostPreference;
  const guestDone = !!room?.guestPreference;
  // 「你」= 当前角色，「TA」= 对方
  const meDone = role === "guest" ? guestDone : hostDone;
  const otherDone = role === "guest" ? hostDone : guestDone;
  const bothDone = hostDone && guestDone;

  // 双方都填完 → 进入匹配
  useEffect(() => {
    if (!room || !bothDone || jumped.current) return;
    jumped.current = true;
    const repo = getRoomRepository();
    if (room.status === "waiting") {
      repo.updateRoom(room.id, { status: "matching" });
    }
    track("both_ready", { roomId: room.id });
    const t = setTimeout(
      () => router.push(`/matching?room=${room.id}&role=${role}`),
      700
    );
    return () => clearTimeout(t);
  }, [room, bothDone, role, router]);

  if (loading) return <div className="min-h-[100dvh] bg-[#F6F6F6]" />;

  if (!room)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#F6F6F6] px-6 text-center">
        <div className="text-[44px]">🤔</div>
        <p className="text-[#6A6A6A]">这个饭局链接失效了</p>
      </div>
    );

  const radiusLabel =
    RADIUS_OPTIONS.find((o) => o.value === room.radius)?.label ?? `${room.radius}m`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#F6F6F6]">
      <GlowBackground />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6">
        <div>
          <div className="text-[44px] leading-none">⏳</div>
          <h1 className="mt-4 text-[24px] font-semibold text-ink">
            {bothDone ? "都选好啦，马上开始" : "你选好啦，等 TA 一下"}
          </h1>
          <p className="mt-2 text-[14px] text-[#6A6A6A]">
            {bothDone ? "正在帮你们拍板…" : "对方填完偏好后自动开始推荐"}
          </p>
        </div>

        {/* 位置信息 */}
        <div className="mt-10 rounded-[20px] bg-white p-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-[15px]">
            <span className="text-[#6A6A6A]">地点</span>
            <span className="font-medium text-ink">{room.location.name}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[15px]">
            <span className="text-[#6A6A6A]">范围</span>
            <span className="font-medium text-ink">{radiusLabel}</span>
          </div>
        </div>

        {/* 双方状态 */}
        <div className="mt-4 rounded-[20px] bg-white p-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)]">
          <StatusRow label="你" done={meDone} />
          <StatusRow label="TA" done={otherDone} last />
        </div>
      </div>
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#F6F6F6]" />}>
      <WaitingInner />
    </Suspense>
  );
}
