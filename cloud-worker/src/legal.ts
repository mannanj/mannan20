export const TERMS_VERSION = '2026-07-18';
export const PRIVACY_VERSION = '2026-07-18';

export function isCurrentLegalVersion(input: {
  termsVersion: unknown;
  privacyVersion: unknown;
}): boolean {
  return (
    input.termsVersion === TERMS_VERSION &&
    input.privacyVersion === PRIVACY_VERSION
  );
}
