import type { ReactNode } from "react";

interface ArticleCaptionProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  italic?: boolean;
  tracking?: string;
  leading?: string;
  marginBottom?: string;
}

export function ArticleCaption({
  children,
  className = "",
  maxWidth = "max-w-2xl",
  fontSize = "text-[13px]",
  fontFamily = "font-[family-name:var(--font-caption)]",
  color = "text-white/50",
  italic = true,
  tracking = "tracking-wide",
  leading = "leading-snug",
  marginBottom = "mb-2",
}: ArticleCaptionProps) {
  const italicClass = italic ? "italic" : "";
  return (
    <p
      className={`${fontFamily} ${italicClass} ${fontSize} ${color} ${leading} ${marginBottom} ${maxWidth} ${tracking} ${className}`.trim()}
    >
      {children}
    </p>
  );
}
