/**
 * MobileShell
 * 手机端优先容器：
 * - PC 打开时限制最大宽度 430px 并水平居中，展示手机布局
 * - 支持 360px–430px 常见手机宽度
 * - 作为流程页 sticky bottom / bottom sheet 的定位参考容器
 */
export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] justify-center">
      <div
        id="app-shell"
        className="relative flex w-full max-w-[430px] flex-col bg-cream shadow-[0_0_60px_-20px_rgba(0,0,0,0.25)]"
        style={{ minHeight: "100dvh" }}
      >
        {children}
      </div>
    </div>
  );
}
