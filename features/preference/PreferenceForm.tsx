"use client";

import { useMemo, useRef, useState } from "react";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { BottomAction } from "@/components/BottomAction";
import {
  FOOD_CATEGORIES,
  PREFERENCE_TAGS,
  PRICE_RANGE,
  TASTE_TAGS,
} from "@/config/options";
import type { UserPreference } from "@/types";
import { emptyPreference } from "@/lib/room/draft";

interface PreferenceFormProps {
  initial?: UserPreference;
  submitLabel?: string;
  onSubmit: (pref: UserPreference) => void;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="text-[19px] font-bold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-faint">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2.5">{children}</div>
    </section>
  );
}

type TagKind = "category" | "taste";
type DropSide = "want" | "avoid";

interface FoodTag {
  label: string;
  kind: TagKind;
}

interface DragState {
  tag: FoodTag;
  x: number;
  y: number;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PreferenceForm({
  initial,
  submitLabel = "选好了",
  onSubmit,
}: PreferenceFormProps) {
  const [pref, setPref] = useState<UserPreference>({
    ...emptyPreference(),
    ...initial,
    preferCategories: initial?.preferCategories ?? [],
    avoidCategories: initial?.avoidCategories ?? [],
    tastePreferences: initial?.tastePreferences ?? [],
    avoidTaste: initial?.avoidTaste ?? [],
    preferenceTags: initial?.preferenceTags ?? [],
  });
  const [priceRange, setPriceRange] = useState(() => ({
    min: initial?.priceRange?.min ?? PRICE_RANGE.min,
    max: initial?.priceRange?.max ?? PRICE_RANGE.max,
  }));
  const [drag, setDrag] = useState<DragState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPoint = useRef({ x: 0, y: 0 });

  const foodTags = useMemo<FoodTag[]>(
    () => [
      ...FOOD_CATEGORIES.map((label) => ({ label, kind: "category" as const })),
      ...TASTE_TAGS.map((label) => ({ label, kind: "taste" as const })),
    ],
    []
  );

  const toggle = (
    key:
      | "preferCategories"
      | "avoidCategories"
      | "tastePreferences"
      | "avoidTaste"
      | "preferenceTags",
    val: string
  ) => {
    setPref((p) => {
      const arr = p[key];
      const next = arr.includes(val)
        ? arr.filter((x) => x !== val)
        : [...arr, val];
      return { ...p, [key]: next };
    });
  };

  const updatePriceRange = (next: { min: number; max: number }) => {
    const min = Math.min(next.min, next.max - PRICE_RANGE.step);
    const max = Math.max(next.max, min + PRICE_RANGE.step);
    const normalized = {
      min: Math.max(PRICE_RANGE.min, Math.min(min, PRICE_RANGE.max - PRICE_RANGE.step)),
      max: Math.min(PRICE_RANGE.max, Math.max(max, PRICE_RANGE.min + PRICE_RANGE.step)),
    };
    setPriceRange(normalized);
    setPref((p) => ({
      ...p,
      priceRange:
        normalized.min === PRICE_RANGE.min && normalized.max === PRICE_RANGE.max
          ? undefined
          : {
              min: normalized.min === PRICE_RANGE.min ? undefined : normalized.min,
              max: normalized.max === PRICE_RANGE.max ? undefined : normalized.max,
            },
    }));
  };

  const selectedWant = foodTags.filter((tag) => isSelected(tag, "want"));
  const selectedAvoid = foodTags.filter((tag) => isSelected(tag, "avoid"));
  // “都可以”里只显示尚未选进想吃/不吃的标签
  const neutralTags = foodTags.filter(
    (tag) => !isSelected(tag, "want") && !isSelected(tag, "avoid")
  );

  function getListKey(tag: FoodTag, side: DropSide) {
    if (side === "want") {
      return tag.kind === "category" ? "preferCategories" : "tastePreferences";
    }
    return tag.kind === "category" ? "avoidCategories" : "avoidTaste";
  }

  function isSelected(tag: FoodTag, side: DropSide) {
    const key = getListKey(tag, side);
    return pref[key].includes(tag.label);
  }

  function placeTag(tag: FoodTag, side: DropSide) {
    const targetKey = getListKey(tag, side);
    const oppositeKey = getListKey(tag, side === "want" ? "avoid" : "want");
    setPref((p) => ({
      ...p,
      [targetKey]: p[targetKey].includes(tag.label)
        ? p[targetKey]
        : [...p[targetKey], tag.label],
      [oppositeKey]: p[oppositeKey].filter((x) => x !== tag.label),
    }));
  }

  /** 从想吃/不吃筐中移出，回到“都可以” */
  function resetTag(tag: FoodTag) {
    const wantKey = getListKey(tag, "want");
    const avoidKey = getListKey(tag, "avoid");
    setPref((p) => ({
      ...p,
      [wantKey]: p[wantKey].filter((x) => x !== tag.label),
      [avoidKey]: p[avoidKey].filter((x) => x !== tag.label),
    }));
  }

  function clearLongPress() {
    if (!longPressTimer.current) return;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function beginPress(tag: FoodTag, e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    latestPoint.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      setDrag({ tag, ...latestPoint.current });
    }, 260);
  }

  function movePress(e: React.PointerEvent<HTMLButtonElement>) {
    latestPoint.current = { x: e.clientX, y: e.clientY };
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
  }

  function endPress() {
    clearLongPress();
    if (!drag) return;
    const el = document.elementFromPoint(drag.x, drag.y);
    const target = el?.closest<HTMLElement>("[data-drop-target]");
    const side = target?.dataset.dropTarget as
      | DropSide
      | "neutral"
      | undefined;
    if (side === "want" || side === "avoid") {
      placeTag(drag.tag, side);
    } else if (side === "neutral") {
      resetTag(drag.tag);
    }
    setDrag(null);
  }

  /** 统一的长按拖拽事件（想吃/不吃筐 与 都可以 里的标签共用） */
  function dragHandlers(tag: FoodTag) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) =>
        beginPress(tag, e),
      onPointerMove: movePress,
      onPointerUp: endPress,
      onPointerCancel: () => {
        clearLongPress();
        setDrag(null);
      },
    };
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">
        <section className="mb-7">
          <h2 className="text-[19px] font-bold text-ink">想吃什么</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <DropBox
              title="想吃"
              side="want"
              tags={selectedWant}
              dragHandlers={dragHandlers}
            />
            <DropBox
              title="坚决不吃"
              side="avoid"
              tags={selectedAvoid}
              dragHandlers={dragHandlers}
            />
          </div>

          <div
            data-drop-target="neutral"
            className="mt-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-card"
          >
            <div className="mb-3 text-center text-sm font-semibold text-ink-faint">
              都可以
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {neutralTags.map((tag) => (
                <button
                  key={`${tag.kind}-${tag.label}`}
                  type="button"
                  {...dragHandlers(tag)}
                  className="press min-h-[40px] select-none touch-none rounded-bubble border border-line bg-surface px-3 text-[14px] font-medium text-ink-soft transition-colors"
                >
                  {tag.label}
                </button>
              ))}
              {neutralTags.length === 0 && (
                <span className="py-2 text-[13px] text-ink-faint">
                  都拖走啦，长按筐里的标签可以拖回来
                </span>
              )}
            </div>
          </div>
        </section>

        <Section title="人均大概？">
          <PriceRangeSlider value={priceRange} onChange={updatePriceRange} />
        </Section>

        <Section title="偏好一点什么？" hint="这些会影响排序，不是绝对底线">
          {PREFERENCE_TAGS.map((c) => (
            <Chip
              key={c}
              label={c}
              variant="prefer"
              selected={pref.preferenceTags.includes(c)}
              onClick={() => toggle("preferenceTags", c)}
            />
          ))}
        </Section>
      </div>

      <BottomAction>
        <Button onClick={() => onSubmit(pref)}>
          {submitLabel}
        </Button>
      </BottomAction>

      {drag && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-bubble bg-ink px-4 py-2 text-[15px] font-semibold text-white shadow-cta"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.tag.label}
        </div>
      )}
    </>
  );
}

function priceLabel(value: number) {
  return value >= PRICE_RANGE.max ? `¥${PRICE_RANGE.max}+` : `¥${value}`;
}

function PriceRangeSlider({
  value,
  onChange,
}: {
  value: { min: number; max: number };
  onChange: (next: { min: number; max: number }) => void;
}) {
  const minPct =
    ((value.min - PRICE_RANGE.min) / (PRICE_RANGE.max - PRICE_RANGE.min)) * 100;
  const maxPct =
    ((value.max - PRICE_RANGE.min) / (PRICE_RANGE.max - PRICE_RANGE.min)) * 100;
  const label =
    value.min === PRICE_RANGE.min && value.max === PRICE_RANGE.max
      ? "不限"
      : `${priceLabel(value.min)} - ${priceLabel(value.max)}`;

  return (
    <div className="w-full rounded-2xl border border-line bg-surface px-4 py-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-faint">人均范围</span>
        <span className="text-[17px] font-bold text-ink">{label}</span>
      </div>

      <div className="relative mt-6 h-8">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          aria-label="最低人均价格"
          type="range"
          min={PRICE_RANGE.min}
          max={PRICE_RANGE.max}
          step={PRICE_RANGE.step}
          value={value.min}
          onChange={(e) =>
            onChange({ min: Number(e.currentTarget.value), max: value.max })
          }
          className="price-range absolute inset-x-0 top-0 z-[1] h-8 w-full appearance-none bg-transparent"
        />
        <input
          aria-label="最高人均价格"
          type="range"
          min={PRICE_RANGE.min}
          max={PRICE_RANGE.max}
          step={PRICE_RANGE.step}
          value={value.max}
          onChange={(e) =>
            onChange({ min: value.min, max: Number(e.currentTarget.value) })
          }
          className="price-range absolute inset-x-0 top-0 z-[2] h-8 w-full appearance-none bg-transparent"
        />
      </div>

      <div className="mt-1 flex justify-between text-xs font-semibold text-ink-faint">
        <span>¥0</span>
        <span>¥100</span>
        <span>¥200</span>
        <span>¥300+</span>
      </div>
    </div>
  );
}

function DropBox({
  title,
  side,
  tags,
  dragHandlers,
}: {
  title: string;
  side: DropSide;
  tags: FoodTag[];
  dragHandlers: (tag: FoodTag) => React.DOMAttributes<HTMLButtonElement>;
}) {
  return (
    <div
      data-drop-target={side}
      className={cx(
        "min-h-[132px] rounded-2xl border px-3 py-3 shadow-card transition-colors",
        side === "want"
          ? "border-accent/30 bg-accent-soft/60"
          : "border-ink/15 bg-surface"
      )}
    >
      <div
        className={cx(
          "mb-2 text-center text-sm font-bold",
          side === "want" ? "text-accent" : "text-ink"
        )}
      >
        {title}
      </div>
      <div className="flex min-h-[76px] flex-wrap content-start justify-center gap-2">
        {tags.map((tag) => (
          <button
            key={`${side}-${tag.kind}-${tag.label}`}
            type="button"
            {...dragHandlers(tag)}
            className={cx(
              "min-h-[34px] select-none touch-none rounded-bubble px-3 text-[13px] font-semibold",
              side === "want" ? "bg-accent text-white" : "bg-ink text-white"
            )}
          >
            {tag.label}
          </button>
        ))}
        {tags.length === 0 && (
          <span className="self-center text-[12px] text-ink-faint">
            拖标签到这里
          </span>
        )}
      </div>
    </div>
  );
}
