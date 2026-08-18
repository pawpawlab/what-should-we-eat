/**
 * 底部固定操作区（Sticky Bottom CTA）。
 * - 拇指易触达位置
 * - 处理 iPhone Home Indicator / Safe Area
 * - 与内容之间有轻微渐隐分隔，避免遮挡
 * 注意：使用它的页面需在内容底部预留 padding，避免被遮挡。
 */
export function BottomAction({
  children,
  tone = "canvas",
}: {
  children: React.ReactNode;
  /** 底部渐变基色，需与页面背景一致 */
  tone?: "canvas" | "cream";
}) {
  const grad =
    tone === "cream"
      ? "from-cream via-cream to-transparent"
      : "from-canvas via-canvas to-transparent";
  return (
    <div
      className={`sticky bottom-0 z-30 mt-auto bg-gradient-to-t ${grad} px-5 pt-4`}
      style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
