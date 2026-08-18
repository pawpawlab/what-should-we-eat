"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PreferenceForm } from "@/features/preference/PreferenceForm";
import { PreferenceHeader } from "@/components/PreferenceHeader";
import { getDraft, patchDraft } from "@/lib/room/draft";
import { getRoomRepository } from "@/lib/room/repository";
import { useRoom } from "@/features/room/useRoom";
import { track } from "@/lib/analytics";
import type { UserPreference } from "@/types";

function HostPreferenceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room") ?? undefined;
  const { room } = useRoom(roomId);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const addressName = room?.location.name ?? getDraft().location?.name ?? "";

  useEffect(() => {
    // 新流程：从首页创建房间后带 room 进来
    if (roomId) {
      setReady(true);
      return;
    }
    // 兼容旧流程：无 room 时依赖 draft 的 location
    const d = getDraft();
    if (!d.location) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [roomId, router]);

  const submit = async (pref: UserPreference) => {
    if (saving) return;
    setSaving(true);
    track("preference_submitted", { role: "host" });
    const repo = getRoomRepository();

    // 新流程：房间已存在，更新 hostPreference
    if (roomId) {
      await repo.updateRoom(roomId, { hostPreference: pref });
      router.push(`/invite?room=${roomId}`);
      return;
    }

    // 兼容旧流程：此处创建房间
    patchDraft({ preference: pref });
    const draft = getDraft();
    const room = await repo.createRoom({
      location: draft.location!,
      radius: draft.radius ?? 2000,
      hostPreference: pref,
    });
    router.push(`/invite?room=${room.id}`);
  };

  if (!ready) return <div className="min-h-[100dvh] bg-cream" />;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <PreferenceHeader roomId={roomId} role="host" />
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

export default function HostPreferencePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <HostPreferenceInner />
    </Suspense>
  );
}
