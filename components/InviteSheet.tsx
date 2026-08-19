"use client";

import { motion } from "framer-motion";
import { BottomSheet } from "@/components/BottomSheet";

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  /** 朋友是否已加入 */
  guestJoined: boolean;
  /** 复制链接 */
  onCopy: () => void;
  /** 分享房间 */
  onShare: () => void;
  copied?: boolean;
}

/** 等待朋友加入时的省略号动画 */
function TypingDots() {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-ink-faint"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.18,
          }}
        />
      ))}
    </span>
  );
}

/** 圆形头像区 */
function AvatarSlot({
  label,
  joined,
  emoji,
}: {
  label: string;
  joined: boolean;
  emoji: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-[76px] w-[76px] items-center justify-center rounded-full text-[34px] ${
          joined
            ? "bg-cream-soft"
            : "border-2 border-dashed border-line bg-cream/60"
        }`}
      >
        {joined ? emoji : <TypingDots />}
      </div>
      <span className="text-[14px] text-[#6A6A6A]">{label}</span>
    </div>
  );
}

export function InviteSheet({
  open,
  onClose,
  guestJoined,
  onCopy,
  onShare,
  copied,
}: InviteSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* 头像区 */}
      <div className="mt-4 flex items-center justify-center gap-10">
        <AvatarSlot label="你" joined emoji="😄" />
        <span className="text-xl text-[#6A6A6A]">+</span>
        <AvatarSlot label="朋友" joined={guestJoined} emoji="🥳" />
      </div>

      {/* 中间文案 */}
      <p className="mt-5 text-center text-[14px] text-[#6A6A6A]">
        {guestJoined
          ? "朋友已加入，马上开始选偏好…"
          : "等待朋友加入，加入后开始选择偏好"}
      </p>

      {/* 按钮区：左复制链接（白底），右分享房间（黑底白字）
          高度/圆角/字号对齐首页底部按钮：64 高、全圆角、18px、regular */}
      <div className="mb-1 mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onCopy}
          className="press inline-flex h-[64px] items-center justify-center rounded-full border border-line bg-white px-4 text-[18px] font-medium text-[#6A6A6A] active:bg-line/40"
        >
          {copied ? "已复制 ✓" : "复制链接"}
        </button>
        <button
          onClick={onShare}
          className="press inline-flex h-[64px] items-center justify-center rounded-full bg-ink px-4 text-[18px] font-medium text-white active:opacity-90"
        >
          分享房间
        </button>
      </div>
    </BottomSheet>
  );
}
