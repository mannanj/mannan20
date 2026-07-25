export type SharePaperResult = 'shared' | 'copied' | 'failed';

export function getGardenPaperShareUrl(
  paperId: string,
  currentUrl: string,
): string {
  const url = new URL(currentUrl);
  url.pathname = '/garden';
  url.search = '';
  url.searchParams.set('paper', paperId);
  url.hash = 'writings';
  return url.toString();
}

export async function shareGardenPaperLink(
  paperId: string,
  title: string,
  currentUrl: string = window.location.href,
): Promise<SharePaperResult> {
  const url = getGardenPaperShareUrl(paperId, currentUrl);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch {
      // A rejected or unavailable share sheet falls through to copying the link.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
