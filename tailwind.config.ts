import type { Config } from "tailwindcss";

/**
 * Design Tokens
 * 视觉关键词：轻松 / 友好 / 有一点随机感 / 简洁 / 不幼稚
 * - Off-white 背景 + 深灰文字 + 单一 Accent Color
 * - 16-24px 圆角，大字号标题，大面积留白
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 背景 / 文字
        canvas: "#F7F5F1", // off-white 背景
        // 浅黄暖色背景（参考图首页风格）
        cream: {
          DEFAULT: "#FCF3E2",
          soft: "#FBEED4",
        },
        surface: "#FFFFFF", // 卡片
        ink: {
          DEFAULT: "#1F1D1B", // 深灰主文字
          soft: "#57534E", // 次级文字
          faint: "#A8A29E", // 弱文字 / 占位
        },
        line: "#ECE9E4", // 分隔线 / outline
        // 单一 Accent Color：暖橙红，带食欲感、又不像外卖 App
        accent: {
          DEFAULT: "#FF5A3C",
          soft: "#FFEDE8",
          ink: "#C63A22",
        },
        // 语义色
        danger: "#E5484D",
        success: "#3DA35D",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        bubble: "999px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["34px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],
        title: ["26px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
      },
      boxShadow: {
        card: "0 6px 24px -12px rgba(31,29,27,0.18)",
        cta: "0 8px 20px -8px rgba(255,90,60,0.5)",
        // 参考图卡片阴影：C89D76 @ 10%，blur 18
        warm: "0 8px 18px 0 rgba(200,157,118,0.10)",
      },
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
      keyframes: {
        "spring-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "60%": { transform: "scale(1.02)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "spring-in": "spring-in 0.35s ease-out both",
        float: "float 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
