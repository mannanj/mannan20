import type { Section } from './types';

const HOME_OFFSET_RATIO = 0.33;
const ABOUT_OFFSET_RATIO = 0.17;
const CONTACT_OFFSET_RATIO = 0.11;

const OFFSET_RATIOS: Record<Section, number> = {
  home: HOME_OFFSET_RATIO,
  about: ABOUT_OFFSET_RATIO,
  contact: CONTACT_OFFSET_RATIO,
};

export function scrollToSection(section: Section): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const elem = document.getElementById(section);
  if (elem) {
    const offsetRatio = OFFSET_RATIOS[section] ?? CONTACT_OFFSET_RATIO;
    const offsetPx = document.documentElement.clientHeight * offsetRatio;
    window.scrollTo(0, elem.offsetTop - offsetPx);
  }
}

export function getPhoneLink(phone: string): string {
  return 'tel:' + phone.replace(/[^0-9+]/g, '');
}

export function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.reject(new Error('Clipboard not available'));
  }
  return navigator.clipboard.writeText(text);
}
