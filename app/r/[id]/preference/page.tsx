"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PreferenceForm } from "@/features/preference/PreferenceForm";
import { GlowBackground } from "@/components/GlowBackground";
import { getRoomRepository } from "@/lib/room/repository";
import { rememberRoomAccess } from "@/lib/room/access";
import { useRoom } from "@/features/room/useRoom";
import { track } from "@/lib/analytics";
import type { UserPreference } from "@/types";

export default function GuestPreferencePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  if (token) rememberRoomAccess(params.id, "guest", token);
  const { room } = useRoom(params.id);
  const addressName = room?.location.name ?? "";
  const [saving, setSaving] = useState(false);

  const submit = async (pref: UserPreference) => {
    if (saving) return;
    setSaving(true);
    track("preference_submitted", { role: "guest" });
    const repo = getRoomRepository();
    // 提交自己的偏好 → 进入等待页（双方都填完后自动进入匹配）
    await repo.updateRoom(params.id, { guestPreference: pref });
    router.push(`/invite?room=${params.id}&role=guest`);
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#F6F6F6]">
      <GlowBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          className="shrink-0 px-6"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)" }}
        >
          <div className="flex items-end justify-between gap-3">
            <h1 className="text-[24px] font-semibold text-ink">选择你的偏好</h1>
            {addressName && (
              <span className="mb-1 max-w-[45%] truncate text-right text-[14px] text-[#6A6A6A]">
                📍 {addressName}
              </span>
            )}
          </div>
          <p className="mt-1 text-[14px] text-[#6A6A6A]">
            双方都选择完成后自动匹配
          </p>
        </div>
        <PreferenceForm
          submitLabel={saving ? "提交中…" : "选好了"}
          onSubmit={submit}
          friendDone={!!room?.hostPreference}
        />
      </div>
    </div>
  );
}
