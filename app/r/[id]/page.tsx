"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/Button";
import { BottomAction } from "@/components/BottomAction";
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

  if (loading) return <div className="min-h-[100dvh] bg-cream" />;

  if (!room)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
        <div className="text-5xl">🤔</div>
        <p className="text-ink-soft">
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
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <AppBar back={false} />

      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="text-center">
          <div className="text-[40px] leading-none">🤗</div>
          <h1 className="mt-3 text-[24px] font-extrabold text-ink">
            朋友喊你一起吃
          </h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            填一下你的口味，帮你们俩一起拍板
          </p>
        </div>

        <p className="mb-2 mt-8 text-[13px] font-semibold text-ink-faint">
          朋友已选好地址
        </p>
        <div className="rounded-3xl bg-surface px-5 py-4 text-[15px] shadow-warm">
          <div>
            地点：<span className="font-semibold text-ink">{room.location.name}</span>
          </div>
          <div className="mt-1.5">
            范围：<span className="font-semibold text-ink">{radiusLabel}</span>
          </div>
        </div>
      </div>

      <BottomAction tone="cream">
        {guestDone ? (
          <Button
            onClick={() => router.push(`/matching?room=${room.id}&role=guest`)}
          >
            看看结果
          </Button>
        ) : (
          <Button
            onClick={() =>
              router.push(
                `/r/${room.id}/preference${token ? `?token=${encodeURIComponent(token)}` : ""}`
              )
            }
          >
            选一下我的口味
          </Button>
        )}
      </BottomAction>
    </div>
  );
}
