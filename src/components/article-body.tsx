import type { ReactNode } from "react";

type Spacing = "comfortable" | "tight";

interface ArticleBodyProps {
  children: ReactNode;
  spacing?: Spacing;
  className?: string;
}

const SPACING_CLASS: Record<Spacing, string> = {
  comfortable: "space-y-8",
  tight: "space-y-6",
};

export function ArticleBody({
  children,
  spacing = "comfortable",
  className = "",
}: ArticleBodyProps) {
  return (
    <div
      className={`${SPACING_CLASS[spacing]} text-sm text-white/70 leading-relaxed ${className}`.trim()}
    >
      {children}
    </div>
  );
}
