import { logger } from "@/lib/logger";

export function track(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const payload = { event, properties, sentAt: new Date().toISOString() };

  logger.info("Analytics event", payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/analytics", JSON.stringify(payload));
  }
}
