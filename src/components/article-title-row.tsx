import type { ReactNode } from "react";

type ArticleTitleRowAlign = "left" | "center";

interface ArticleTitleRowProps {
  children: ReactNode;
  actions?: ReactNode;
  align?: ArticleTitleRowAlign;
  className?: string;
}

export function ArticleTitleRow({
  children,
  actions,
  align = "left",
  className = "",
}: ArticleTitleRowProps) {
  const alignClass = align === "center" ? "justify-center text-center" : "";

  return (
    <div
      className={`mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 ${alignClass} ${className}`.trim()}
    >
      {children}
      {actions}
    </div>
  );
}
