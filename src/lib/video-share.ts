export type ShareVideoResult = 'shared' | 'copied' | 'failed';

export function getVideoShareUrl(videoId: string, currentUrl: string): string {
  const url = new URL(currentUrl);
  url.search = '';
  url.searchParams.set('video', videoId);
  url.hash = videoId;
  return url.toString();
}

export async function shareVideoLink(
  videoId: string,
  title: string,
  currentUrl: string = window.location.href,
): Promise<ShareVideoResult> {
  const url = getVideoShareUrl(videoId, currentUrl);

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
