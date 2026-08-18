"use client";

import { useRouter } from "next/navigation";

interface AppBarProps {
  /** 是否显示返回按钮 */
  back?: boolean;
  /** 自定义返回行为 */
  onBack?: () => void;
  /** 轻量步骤指示，如 "1 / 2" */
  step?: string;
  /** 居中标题（默认不显示，保持轻量） */
  title?: string;
  /** 透明背景（用于带渐变底色的页面，如结果页） */
  transparent?: boolean;
}

export function AppBar({ back = true, onBack, step, title, transparent }: AppBarProps) {
  const router = useRouter();
  return (
    <div
      className={`sticky top-0 z-20 flex h-14 items-center justify-between px-3 ${
        transparent ? "" : "bg-cream/85 backdrop-blur"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex w-14 justify-start">
        {back && (
          <button
            aria-label="返回"
            onClick={() => (onBack ? onBack() : router.back())}
            className="press flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-line/60"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      <div className="flex w-14 justify-end pr-1 text-sm font-medium text-ink-faint">
        {step}
      </div>
    </div>
  );
}
