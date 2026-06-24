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
  const alignClass = align === "center" ? "text-center" : "";
  const mobileActionAlign = align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`mb-2 ${alignClass} ${className}`.trim()}>
      <span className="relative inline-block max-w-full align-baseline">
        {children}
        {actions && (
          <span
            className={`mt-1 flex ${mobileActionAlign} sm:absolute sm:left-full sm:top-1/2 sm:ml-3 sm:mt-0 sm:-translate-y-1/2 sm:justify-start`}
          >
            {actions}
          </span>
        )}
      </span>
    </div>
  );
}
