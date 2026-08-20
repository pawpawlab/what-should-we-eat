"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlowBackground } from "@/components/GlowBackground";
import { useRoom } from "@/features/room/useRoom";
import { rememberRoomAccess } from "@/lib/room/access";
import { getRoomRepository } from "@/lib/room/repository";
import { track } from "@/lib/analytics";
import { RADIUS_OPTIONS } from "@/config/options";

export default function GuestEntryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  if (token) rememberRoomAccess(params.id, "guest", token);
  const { room, loading } = useRoom(params.id);
  const marked = useRef(false);

  // 进入即标记「朋友已加入」，通知 host 端
  useEffect(() => {
    if (!room || marked.current) return;
    marked.current = true;
    track("guest_joined", { roomId: room.id });
    if (!room.guestJoined) {
      getRoomRepository().updateRoom(room.id, { guestJoined: true });
    }
  }, [room]);

  if (loading) return <div className="min-h-[100dvh] bg-[#F6F6F6]" />;

  if (!room)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#F6F6F6] px-[36px] text-center">
        <div className="text-5xl">🤔</div>
        <p className="text-[#6A6A6A]">
          没找到这个饭局
          <br />
          链接可能已经失效了
        </p>
      </div>
    );

  const guestDone = !!room.guestPreference;
  const radiusLabel =
    RADIUS_OPTIONS.find((o) => o.value === room.radius)?.label ?? `${room.radius}m`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#F6F6F6]">
      <GlowBackground />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-[36px]">
        <div>
          <div className="text-[44px] leading-none">🤗</div>
          <h1 className="mt-4 text-[24px] font-semibold text-ink">
            朋友喊你一起吃
          </h1>
          <p className="mt-2 text-[14px] text-[#6A6A6A]">
            填一下你的口味，帮你们俩一起拍板
          </p>
        </div>

        <div className="mt-10 rounded-[20px] bg-white p-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)]">
          <p className="text-[14px] text-[#6A6A6A]">朋友已选好位置</p>
          <div className="mt-4 flex items-center gap-2 text-[15px]">
            <span className="text-[#6A6A6A]">地点</span>
            <span className="font-medium text-ink">{room.location.name}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[15px]">
            <span className="text-[#6A6A6A]">范围</span>
            <span className="font-medium text-ink">{radiusLabel}</span>
          </div>
        </div>
      </div>

      {/* 底部（对齐首页：#F6F6F6 渐隐、两边 36、黑色全圆角胶囊、18px medium） */}
      <div
        className="sticky bottom-0 z-30 mt-auto px-[36px] pt-4"
        style={{
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          background: "linear-gradient(to top,#F6F6F6 65%,rgba(246,246,246,0))",
        }}
      >
        <button
          onClick={() =>
            guestDone
              ? router.push(`/invite?room=${room.id}&role=guest`)
              : router.push(
                  `/r/${room.id}/preference${token ? `?token=${encodeURIComponent(token)}` : ""}`
                )
          }
          className="press flex h-[64px] w-full items-center justify-center rounded-full bg-ink text-[18px] font-medium text-white transition-opacity active:opacity-90"
        >
          {guestDone
            ? room.hostPreference
              ? "看看结果"
              : "看看进度"
            : "选一下我的口味"}
        </button>
      </div>
    </div>
  );
}
