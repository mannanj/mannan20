export type ArticleMetaVariant = "inline" | "pill";

interface ArticleMetaProps {
  date: string;
  readTime?: string;
  wordCount?: string;
  variant?: ArticleMetaVariant;
  separator?: string;
  className?: string;
}

export function ArticleMeta({
  date,
  readTime,
  wordCount,
  variant = "inline",
  separator = "·",
  className = "",
}: ArticleMetaProps) {
  const parts = [date, readTime, wordCount].filter(Boolean) as string[];
  const text = parts.join(` ${separator} `);

  if (variant === "pill") {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2 bg-white/[0.06] border border-white/20 rounded-full ${className}`.trim()}
      >
        <span className="text-[11px] text-white/70 tracking-[0.18em] uppercase">
          {text}
        </span>
      </div>
    );
  }

  return (
    <p className={`text-xs text-white/30 mb-6 ${className}`.trim()}>{text}</p>
  );
}
