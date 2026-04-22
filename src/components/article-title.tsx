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
    "font-serif text-2xl leading-[1.15] md:text-3xl md:leading-[1.1] tracking-[-0.4px] md:tracking-[-0.6px] text-center text-white md:max-w-4xl",
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
