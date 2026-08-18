"use client";

import { motion } from "framer-motion";

interface BubbleProps {
  size?: number;
  className?: string;
  children?: React.ReactNode;
  float?: boolean;
  delay?: number;
}

/** 圆形 Bubble —— 产品核心视觉元素（代表「一个人」） */
export function Bubble({
  size = 72,
  className = "",
  children,
  float = false,
  delay = 0,
}: BubbleProps) {
  return (
    <motion.div
      className={`flex items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size }}
      animate={float ? { y: [0, -6, 0] } : undefined}
      transition={
        float
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
