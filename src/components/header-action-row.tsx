import type { ComponentProps } from "react";
import { PdfActionRow } from "@/components/pdf-action-row";

type HeaderActionRowProps = ComponentProps<typeof PdfActionRow>;

export function HeaderActionRow({
  className = "",
  wrap = false,
  ...props
}: HeaderActionRowProps) {
  return (
    <PdfActionRow
      {...props}
      wrap={wrap}
      className={`gap-4 ${className}`.trim()}
    />
  );
}
