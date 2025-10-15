export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }

  return null;
}

export function isDevMode(): boolean {
  console.log('Cookie isMannanDev:', getCookie('isMannanDev'));
  return getCookie('isMannanDev') === '1';
}
