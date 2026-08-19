"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InviteSheet } from "@/components/InviteSheet";
import { RadiusSlider } from "@/components/RadiusSlider";
import { GlowBackground } from "@/components/GlowBackground";
import {
  getDraft,
  patchDraft,
  getCurrentRoomId,
  setCurrentRoomId,
  clearCurrentRoomId,
} from "@/lib/room/draft";
import { getRoomRepository } from "@/lib/room/repository";
import { getRoomAccessToken, rememberRoomAccess } from "@/lib/room/access";
import { useRoom } from "@/features/room/useRoom";
import { track } from "@/lib/analytics";
import type { LocationInfo } from "@/types";

type PlaceResult = { name: string; area: string; lat: number; lng: number };

export default function HomePage() {
  const router = useRouter();

  const [location, setLocation] = useState<LocationInfo | null>(null);
  // 默认最近档 500m（对齐设计稿）
  const [radius, setRadius] = useState<number>(500);

  // 地址搜索
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // 邀请弹层 + 房间
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { room } = useRoom(roomId);
  const jumped = useRef(false);

  // 恢复草稿 + 未完成的房间
  useEffect(() => {
    const d = getDraft();
    if (d.location) setLocation(d.location);
    if (d.radius) setRadius(d.radius);

    // 恢复上次「邀请后创建、但还没匹配完」的房间，便于继续等待朋友加入
    const savedId = getCurrentRoomId();
    if (savedId) {
      getRoomRepository()
        .getRoom(savedId)
        .then((r) => {
          // 仍在等待中才恢复；已进入匹配/完成或不存在则清理
          if (r && r.status === "waiting") {
            setRoomId(savedId);
          } else {
            clearCurrentRoomId();
          }
        })
        .catch(() => clearCurrentRoomId());
    }
  }, []);

  // 使用当前位置
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let name = "当前位置附近";
        try {
          const resp = await fetch(
            `/api/geo/regeo?lat=${latitude}&lng=${longitude}&coord=wgs84`
          );
          const data = await resp.json();
          if (data?.name) name = data.name;
        } catch {
          /* 忽略，保留兜底名 */
        }
        setLocation({
          lat: latitude,
          lng: longitude,
          name,
          coordSystem: "wgs84",
        });
        setQuery("");
        setResults([]);
        setSearching(false);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // 地址搜索（防抖）
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
        const data = await resp.json();
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // 邀请链接
  const shareLink =
    typeof window !== "undefined" && roomId
      ? `${window.location.origin}/r/${roomId}?role=guest&token=${encodeURIComponent(
          room?.guestToken || getRoomAccessToken(roomId, "guest") || ""
        )}`
      : "";

  // 点击「邀请朋友，填写各自偏好」→ 复用已有房间或创建 + 打开弹层
  const invite = async () => {
    if (!location || creating) return;
    setCreating(true);
    patchDraft({ location, radius });
    track("home_location_selected", { name: location.name, radius });

    const repo = getRoomRepository();

    // 1. 若已有「进行中」房间且仍在等待，则复用（关掉半层再点进来还是同一个房间/链接）
    const existingId = roomId ?? getCurrentRoomId() ?? undefined;
    if (existingId) {
      const existing = await repo.getRoom(existingId);
      if (existing && existing.status === "waiting") {
        // 位置或范围改了 → 更新到同一房间（链接不变），否则原样复用
        if (
          existing.location.name !== location.name ||
          existing.location.lat !== location.lat ||
          existing.location.lng !== location.lng ||
          existing.radius !== radius
        ) {
          await repo.updateRoom(existing.id, { location, radius });
        }
        setRoomId(existing.id);
        setCurrentRoomId(existing.id);
        setSheetOpen(true);
        setCreating(false);
        track("invite_opened", { roomId: existing.id, reused: true });
        return;
      }
      // 失效则清理，走新建
      clearCurrentRoomId();
    }

    // 2. 没有可复用房间 → 创建新的
    const created = await repo.createRoom({ location, radius });
    rememberRoomAccess(created.id, "host", created.hostToken);
    rememberRoomAccess(created.id, "guest", created.guestToken);
    setRoomId(created.id);
    setCurrentRoomId(created.id);
    setSheetOpen(true);
    setCreating(false);
    track("invite_opened", { roomId: created.id });
  };

  // 朋友加入 → host 自动进入偏好页
  useEffect(() => {
    if (!room || jumped.current) return;
    if (room.guestJoined || room.guestPreference) {
      jumped.current = true;
      track("guest_joined_host_side", { roomId: room.id });
      // 房间已进入正式流程，首页不再需要「恢复它」
      clearCurrentRoomId();
      setTimeout(() => router.push(`/preference?room=${room.id}`), 600);
    }
  }, [room, router]);

  const copy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!shareLink) return;
    track("invite_shared");
    const text = `今晚吃什么？来选一下你想吃和不想吃的：\n${shareLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "就吃这个", text, url: shareLink });
        return;
      } catch {
        /* 用户取消 */
      }
    }
    copy();
  };

  const canInvite = !!location;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#F6F6F6]">
      <GlowBackground />

      <div className="relative z-10 flex-1 overflow-y-auto px-[36px] pb-4 no-scrollbar">
        {/* 头部区 */}
        <div className="pt-[120px]">
          <div className="text-[44px] leading-none">👀</div>
          <h1 className="mt-4 text-[24px] font-semibold text-ink">
            你俩正在纠结吃什么？
          </h1>
        </div>

        {/* 卡片 1：选地址 */}
        <div className="mt-10 rounded-[20px] bg-white p-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-1.5 text-[14px] text-[#6A6A6A]">
            <span>📍</span>
            <span>你们位于...</span>
          </div>
          <div className="mt-4 flex h-[50px] items-center rounded-lg bg-[#FAFAFA] pl-5 pr-1.5">
            <input
              value={searching ? query : location ? location.name : query}
              onFocus={() => {
                setSearching(true);
                setQuery("");
              }}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="点击输入位置"
              className="min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              aria-label="定位当前位置"
              onClick={useCurrentLocation}
              className="press flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-white shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)] active:bg-line/40"
            >
              {locating ? (
                <span className="text-[12px] text-ink-faint">…</span>
              ) : (
                <LocateIcon />
              )}
            </button>
          </div>

          {/* 搜索结果下拉 */}
          {searching && results.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-line">
              {results.map((p, i) => (
                <button
                  key={`${p.name}-${i}`}
                  onClick={() => {
                    setLocation({
                      lat: p.lat,
                      lng: p.lng,
                      name: `${p.name}附近`,
                      coordSystem: "gcj02",
                    });
                    setQuery("");
                    setResults([]);
                    setSearching(false);
                  }}
                  className="press flex w-full flex-col items-start border-b border-line bg-surface px-4 py-3 text-left last:border-0 active:bg-cream/60"
                >
                  <span className="text-ink">{p.name}</span>
                  <span className="text-[13px] text-ink-faint">{p.area}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 卡片 2：距离可以接受 */}
        <div className="mt-4 rounded-[20px] bg-white p-6 shadow-[0_0_0.5px_0_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex items-center gap-1.5 text-[14px] text-[#6A6A6A]">
            <span>🚶</span>
            <span>距离可以接受...</span>
          </div>
          <RadiusSlider value={radius} onChange={setRadius} />
        </div>
      </div>

      {/* 底部按钮区 */}
      <div
        className="sticky bottom-0 z-20 mt-auto px-[36px] pt-4"
        style={{
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          background:
            "linear-gradient(to top,#F6F6F6 65%,rgba(246,246,246,0))",
        }}
      >
        <button
          disabled={!canInvite || creating}
          onClick={invite}
          className="press flex h-[64px] w-full items-center justify-center rounded-full bg-ink text-[18px] font-medium text-white transition-opacity disabled:opacity-40"
        >
          {creating ? "创建中…" : canInvite ? "邀请朋友 填写各自偏好" : "先选个位置"}
        </button>
        <p className="mt-3 text-center text-[14px] text-[#6A6A6A]">
          综合二人偏好推荐餐厅~
        </p>
      </div>

      <InviteSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        guestJoined={!!(room?.guestJoined || room?.guestPreference)}
        onCopy={copy}
        onShare={share}
        copied={copied}
      />
    </div>
  );
}

/** 定位准星图标（橙色） */
function LocateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" stroke="#F5821F" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.8" fill="#F5821F" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="#F5821F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
