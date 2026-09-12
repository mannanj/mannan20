import type { ArticleStateEnv, GardenMetrics } from "./types";

function operationId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function requireState(env: ArticleStateEnv) {
  if (!env.MCP_ARTICLE_STATE) {
    throw new Error("MCP article state is unavailable");
  }
  return env.MCP_ARTICLE_STATE;
}

function requireMetrics(
  result: GardenMetrics | { error: "invalid_input" },
): GardenMetrics {
  if ("error" in result) throw new Error(result.error);
  return result;
}

export async function getArticleMetrics(
  env: ArticleStateEnv,
  slug: string,
): Promise<GardenMetrics> {
  const result = await requireState(env).getArticleMetrics({ slug });
  return requireMetrics(result);
}

export async function recordArticleFetch(
  env: ArticleStateEnv,
  slug: string,
): Promise<void> {
  try {
    const state = requireState(env);
    const result = await state.incrementArticleFetch({ opId: operationId(), slug });
    requireMetrics(result);
  } catch {
    // Article content is public and remains available if optional analytics fail.
  }
}

export async function resetArticleFetches(
  env: ArticleStateEnv,
  slug: string,
): Promise<GardenMetrics> {
  const result = await requireState(env).resetArticleFetches({
    opId: operationId(),
    slug,
  });
  return requireMetrics(result);
}
