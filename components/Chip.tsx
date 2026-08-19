"use client";

import { motion } from "framer-motion";

type ChipVariant = "prefer" | "avoid" | "neutral";

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: ChipVariant;
}

/**
 * Tag Chip：触控友好（最低高度 44px）。
 * - prefer 选中：Accent 实心
 * - avoid 选中：语义化的深色描边 / 浅底（表达「排除」）
 */
export function Chip({ label, selected, onClick, variant = "prefer" }: ChipProps) {
  const base =
    "press inline-flex min-h-[44px] items-center rounded-bubble px-4 text-[15px] font-medium transition-colors select-none";

  let cls = "";
  if (!selected) {
    cls = "bg-surface text-ink-soft border border-line";
  } else if (variant === "prefer") {
    cls = "bg-accent text-white border border-accent";
  } else if (variant === "avoid") {
    cls = "bg-ink text-white border border-ink";
  } else {
    cls = "bg-ink text-white border border-ink";
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`${base} ${cls}`}
    >
      {variant === "avoid" && selected && (
        <span className="mr-1 text-white/90">✕</span>
      )}
      {label}
    </motion.button>
  );
}
