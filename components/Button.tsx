"use client";

import { motion } from "framer-motion";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  full?: boolean;
}

/** 主按钮最低高度 48px，触控友好 */
export function Button({
  variant = "primary",
  full = true,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "press inline-flex min-h-[52px] items-center justify-center rounded-2xl px-6 text-[17px] font-semibold transition-colors disabled:opacity-40";
  const variants: Record<string, string> = {
    primary: "bg-accent text-white shadow-cta active:bg-accent-ink",
    secondary: "bg-surface text-ink border border-line active:bg-line/50",
    ghost: "bg-transparent text-ink-soft active:bg-line/40",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
