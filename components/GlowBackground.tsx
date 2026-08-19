/**
 * 顶部两个模糊光晕圆背景（还原设计稿，画板基准 393×852）。
 * 用法：放在一个 `relative bg-[#F6F6F6]` 容器内，内容用 `relative z-10` 叠在其上。
 */
export function GlowBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 左圆 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 663,
          height: 389,
          left: -373,
          top: -296,
          background: "#FFE5CB",
          filter: "blur(62px)",
        }}
      />
      {/* 右圆 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 663,
          height: 389,
          left: 92,
          top: -226,
          background: "#FFE5CB",
          filter: "blur(62px)",
        }}
      />
    </div>
  );
}
