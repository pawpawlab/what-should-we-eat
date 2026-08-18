"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PreferenceForm } from "@/features/preference/PreferenceForm";
import { PreferenceHeader } from "@/components/PreferenceHeader";
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
    // 双方完成 → 直接进入匹配（会通知 Host 端）
    await repo.updateRoom(params.id, {
      guestPreference: pref,
      status: "matching",
    });
    router.push(`/matching?room=${params.id}&role=guest`);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <PreferenceHeader roomId={params.id} role="guest" />
      <div className="px-5 pt-4">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-title text-ink">选择你的偏好</h1>
          {addressName && (
            <span className="mb-1 max-w-[45%] truncate text-right text-[13px] text-ink-faint">
              📍 {addressName}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-faint">双方都选择完成后自动匹配</p>
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <PreferenceForm
          submitLabel={saving ? "提交中…" : "选好了"}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
