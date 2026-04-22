import type { ReactNode } from "react";

type HeaderAlign = "left" | "center";

interface ArticleHeaderProps {
  children: ReactNode;
  align?: HeaderAlign;
  className?: string;
}

export function ArticleHeader({
  children,
  align = "left",
  className = "",
}: ArticleHeaderProps) {
  const alignClass = align === "center" ? "flex flex-col items-center" : "";
  return (
    <div className={`${alignClass} ${className}`.trim()}>{children}</div>
  );
}
