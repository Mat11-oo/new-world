/**
 * 「New World」品牌标记：一颗被轨道环绕的新世界。
 * 使用 currentColor，自动适配深色 / 浅色顶栏。
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="8.4" fill="currentColor" />
      <ellipse
        cx="16"
        cy="16"
        rx="14.2"
        ry="4.6"
        stroke="currentColor"
        strokeWidth="1.35"
        transform="rotate(-24 16 16)"
        opacity="0.72"
      />
      <circle cx="27.1" cy="10.1" r="1.6" fill="currentColor" />
    </svg>
  );
}
