"use client";

import { useRoom } from "@/features/room/useRoom";
import type { Role } from "@/types";

interface PreferenceHeaderProps {
  roomId?: string;
  /** 当前正在填偏好的人 */
  role: Role;
  /** 内容是否已滚动（决定顶栏是否显示白色模糊背景） */
  scrolled?: boolean;
}

function StatusChip({ done }: { done: boolean }) {
  return (
    <span
      className={`rounded-bubble px-2.5 py-1 text-[12px] ${
        done ? "bg-success/15 text-success" : "bg-ink/10 text-ink-soft"
      }`}
    >
      {done ? "已选好" : "选择中…"}
    </span>
  );
}

/**
 * 偏好页顶栏（吸顶）：两个头像并排居中，左人状态在左、右人状态在右。
 * 「自己」永远「选择中…」（正在此页填写、还没提交），「对方」看其偏好是否已填。
 */
export function PreferenceHeader({
  roomId,
  role,
  scrolled = false,
}: PreferenceHeaderProps) {
  const { room } = useRoom(roomId);

  const hostDone = !!room?.hostPreference;
  const guestDone = !!room?.guestPreference;

  // 左 = 我（选择中…），右 = 对方
  const meDone = false;
  const otherDone = role === "host" ? guestDone : hostDone;

  return (
    <div
      className={`sticky top-0 z-20 flex items-center justify-center gap-2 px-4 py-2.5 transition-[background-color,backdrop-filter] duration-200 ${
        scrolled ? "bg-[#F6F6F6]/85 backdrop-blur" : "bg-transparent"
      }`}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
    >
      {/* 你：状态紧挨头像 */}
      <StatusChip done={meDone} />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-[20px]">
        😄
      </span>
      {/* 朋友：头像 + 状态 */}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-[20px]">
        🥳
      </span>
      <StatusChip done={otherDone} />
    </div>
  );
}
