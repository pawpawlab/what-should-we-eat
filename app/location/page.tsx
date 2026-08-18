"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Button } from "@/components/Button";
import { BottomAction } from "@/components/BottomAction";
import { BottomSheet } from "@/components/BottomSheet";
import { Chip } from "@/components/Chip";
import { DEFAULT_RADIUS, RADIUS_OPTIONS } from "@/config/options";
import { getDraft, patchDraft } from "@/lib/room/draft";
import { track } from "@/lib/analytics";
import type { LocationInfo } from "@/types";

type PlaceResult = { name: string; area: string; lat: number; lng: number };

export default function LocationPage() {
  const router = useRouter();
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [locating, setLocating] = useState(false);
  const [deniedSheet, setDeniedSheet] = useState(false);

  useEffect(() => {
    const d = getDraft();
    if (d.location) setLocation(d.location);
    if (d.radius) setRadius(d.radius);
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setDeniedSheet(true);
      return;
    }
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
          // 忽略，保留兜底名
        }
        setLocation({
          lat: latitude,
          lng: longitude,
          name,
          coordSystem: "wgs84", // 浏览器定位为 WGS-84
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setDeniedSheet(true); // 拒绝定位 → 引导手动搜索，而非报错页
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // 搜索地点（防抖）
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

  const next = () => {
    if (!location) return;
    patchDraft({ location, radius });
    track("location_selected", { name: location.name, radius });
    router.push("/preference");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <AppBar step="1 / 2" />

      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        <h1 className="text-title text-ink">在哪附近吃？</h1>

        {/* 入口 A：当前位置 */}
        <button
          onClick={useCurrentLocation}
          className="press mt-5 flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-card"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-xl">
            📍
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">
              {locating ? "定位中…" : "使用当前位置"}
            </span>
            {location && !locating && (
              <span className="mt-0.5 block text-sm text-accent">
                {location.name} · 重新定位 &gt;
              </span>
            )}
          </span>
        </button>

        {/* 入口 B：搜索地点 */}
        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索商圈、地铁站或地址"
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
          {results.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-surface shadow-card">
              {results.map((p, i) => (
                <button
                  key={`${p.name}-${i}`}
                  onClick={() => {
                    setLocation({
                      lat: p.lat,
                      lng: p.lng,
                      name: `${p.name}附近`,
                      coordSystem: "gcj02", // 高德/内置地点为 GCJ-02
                    });
                    setQuery("");
                    setResults([]);
                  }}
                  className="press flex w-full flex-col items-start border-b border-line px-4 py-3 text-left last:border-0 active:bg-line/40"
                >
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="text-sm text-ink-faint">{p.area}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 搜索范围 */}
        <div className="mt-8">
          <h2 className="text-[19px] font-bold text-ink">愿意走多远？</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {RADIUS_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={radius === o.value}
                onClick={() => setRadius(o.value)}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-faint">
            {RADIUS_OPTIONS.find((o) => o.value === radius)?.hint}
          </p>
        </div>
      </div>

      <BottomAction>
        <Button disabled={!location} onClick={next}>
          {location ? "下一步" : "先选个位置"}
        </Button>
      </BottomAction>

      <BottomSheet
        open={deniedSheet}
        onClose={() => setDeniedSheet(false)}
        title="没拿到你的位置"
      >
        <p className="text-[15px] text-ink-soft">
          可以手动搜索附近的地点，或重新授权定位。
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            onClick={() => {
              setDeniedSheet(false);
              document.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            搜索地点
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDeniedSheet(false);
              useCurrentLocation();
            }}
          >
            重新授权
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
