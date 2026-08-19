"use client";

import { useRef } from "react";
import { RADIUS_OPTIONS } from "@/config/options";

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * 距离滑动条：可拖动，但只会卡位到 5 个档位（500m/1km/2km/3km/5km）。
 * 刻度标签在轨道上方，当前档加粗高亮。
 */
export function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const n = RADIUS_OPTIONS.length; // 5
  const activeIndex = Math.max(
    0,
    RADIUS_OPTIONS.findIndex((o) => o.value === value)
  );
  const activePct = (activeIndex / (n - 1)) * 100;

  // 根据指针横坐标吸附到最近档位
  const snapFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (n - 1));
    const next = RADIUS_OPTIONS[idx].value;
    if (next !== value) onChange(next);
  };

  return (
    <div className="select-none">
      {/* 刻度标签 */}
      <div className="flex justify-between">
        {RADIUS_OPTIONS.map((o, i) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              i === activeIndex
                ? "text-[22px] font-normal text-ink"
                : "text-[16px] font-normal text-ink-faint"
            }
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* 轨道 + 刻度点 + thumb */}
      <div
        ref={trackRef}
        className="relative mt-4 h-6 cursor-pointer touch-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          snapFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) snapFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* 轨道底线 */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line" />

        {/* 刻度点 */}
        {RADIUS_OPTIONS.map((o, i) => (
          <span
            key={o.value}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line"
            style={{ left: `${(i / (n - 1)) * 100}%` }}
          />
        ))}

        {/* thumb：橙色空心圆环 */}
        <span
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-surface shadow-sm transition-[left] duration-150"
          style={{ left: `${activePct}%`, borderColor: "#F5821F" }}
        />
      </div>
    </div>
  );
}
