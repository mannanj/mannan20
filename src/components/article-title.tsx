import type { ReactNode } from "react";

export type ArticleTitleVariant = "community" | "editorial";

interface ArticleTitleProps {
  children: ReactNode;
  variant?: ArticleTitleVariant;
  className?: string;
  as?: "h1" | "h2";
}

const VARIANT_CLASSES: Record<ArticleTitleVariant, string> = {
  community: "text-2xl font-semibold tracking-tight text-white mb-2",
  editorial:
    "font-serif text-4xl leading-[1.15] md:text-6xl md:leading-[1.1] tracking-[-0.8px] md:tracking-[-1.2px] text-center text-white md:max-w-4xl",
};

export function ArticleTitle({
  children,
  variant = "community",
  className = "",
  as: Tag = "h1",
}: ArticleTitleProps) {
  return (
    <Tag className={`${VARIANT_CLASSES[variant]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
