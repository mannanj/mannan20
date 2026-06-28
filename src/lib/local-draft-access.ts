const LOCAL_DRAFT_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

interface LocalDraftAccessInput {
  host: string | null;
  nodeEnv: string | undefined;
}

export function canViewLocalDraft({
  host,
  nodeEnv,
}: LocalDraftAccessInput): boolean {
  return nodeEnv === "development" && Boolean(host?.match(LOCAL_DRAFT_HOSTS));
}
