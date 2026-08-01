const TURNSTILE_TIMEOUT_MS = 5_000;

/**
 * Verifies a Turnstile proof through the site's verification worker.
 *
 * This deliberately exposes no provider response or failure detail to callers.
 */
export async function verifyTurnstileToken(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const workerUrl = process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL;
  if (!token.trim() || !workerUrl) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const response = await fetcher(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    if (!response.ok) return false;

    const data: unknown = await response.json();
    return typeof data === 'object' && data !== null && (data as { success?: unknown }).success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
