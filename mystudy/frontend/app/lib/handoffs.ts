import type { AnswerMap, PrecheckOutcome } from "@/lib/questions";

type CreateHandoffInput = {
  studyId: string;
  locale: string;
  source: string;
  campaign: string;
  selectedSiteId: string;
  precheckOutcome: PrecheckOutcome;
  answers: AnswerMap;
};

export async function createHandoff({
  studyId,
  ...payload
}: CreateHandoffInput): Promise<void> {
  const response = await fetch(`/api/studies/${studyId}/handoffs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error ?? "Unable to continue");
  }
}
