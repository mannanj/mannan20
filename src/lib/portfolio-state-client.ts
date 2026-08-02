import { getCloudflareContext } from '@opennextjs/cloudflare';

interface ServiceFetcher {
  fetch(request: Request): Promise<Response>;
}

interface StateEnv {
  PORTFOLIO_STATE?: ServiceFetcher;
  STATE_SERVICE_SECRET?: string;
}

function stateEnv(): StateEnv {
  try {
    return getCloudflareContext().env as unknown as StateEnv;
  } catch {
    return {};
  }
}

export function stateOperationId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function callPortfolioState<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | undefined> {
  const env = stateEnv();
  const secret = env.STATE_SERVICE_SECRET ?? process.env.STATE_SERVICE_SECRET;
  const publicUrl = process.env.PORTFOLIO_STATE_WORKER_URL?.replace(/\/+$/, '');
  if (!secret || (!env.PORTFOLIO_STATE && !publicUrl)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Portfolio state service is not configured');
    }
    return undefined;
  }

  const request = new Request(
    env.PORTFOLIO_STATE ? `https://portfolio-state-worker${path}` : `${publicUrl}${path}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-state-service-key': secret,
      },
      body: JSON.stringify(body),
    },
  );
  const response = env.PORTFOLIO_STATE
    ? await env.PORTFOLIO_STATE.fetch(request)
    : await fetch(request);
  if (!response.ok) throw new Error(`Portfolio state request failed (${response.status})`);
  return (await response.json()) as T;
}
