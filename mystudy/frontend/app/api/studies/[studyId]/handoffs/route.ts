import { logger } from "@/lib/logger";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

type RouteContext = {
  params: Promise<{ studyId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { studyId } = await params;
  const body: unknown = await request.json();

  logger.info("Creating study handoff", { studyId, body });

  try {
    const backendResponse = await fetch(
      `${BACKEND_URL}/studies/${encodeURIComponent(studyId)}/handoffs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!backendResponse.ok) {
      return Response.json(
        { error: await backendResponse.text() },
        { status: backendResponse.status },
      );
    }

    return Response.json(await backendResponse.json(), { status: 201 });
  } catch (error) {
    logger.error("Study handoff failed", { studyId, body, error });
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
