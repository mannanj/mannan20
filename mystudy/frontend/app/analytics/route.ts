import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const event: unknown = await request.json();
  logger.info("Analytics event received", { event });
  return new Response(null, { status: 202 });
}
