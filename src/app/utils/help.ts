import { Store } from "@ngrx/store";
import { Links } from "../models/models";
import { setSelectedLink } from "../store/app.actions";

const HOME_OFFSET_RATIO = 0.33;
const ABOUT_OFFSET_RATIO = 0.17;
const CONTACT_OFFSET_RATIO = 0.11;
const DEFAULT_OFFSET_RATIO = 0.11;

export function scrollToSection(section: Links): void {
  const elem: HTMLElement | null = document.getElementById(section);
  if (elem) {
    const offsetPx: number = determineOffsetPx(section);
    window.scrollTo(0, elem.offsetTop - offsetPx);
  }
}

export function determineOffsetPx(link: Links): number {
  const offsetRatios: Record<Links, number> = {
    [Links.home]: HOME_OFFSET_RATIO,
    [Links.about]: ABOUT_OFFSET_RATIO,
    [Links.contact]: CONTACT_OFFSET_RATIO,
  };

  const offsetRatio = offsetRatios[link] ?? DEFAULT_OFFSET_RATIO;
  return document.documentElement.clientHeight * offsetRatio;
}

export function navigateTo(store: Store, link: Links): void {
  store.dispatch(setSelectedLink({ link }));
  scrollToSection(link);
}

export function getPhoneLink(phone: string): string {
  return 'tel:' + phone.replace(/[^0-9+]/g, '');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}