import { Store } from "@ngrx/store";
import { Links } from "../models/models";
import { setSelectedLink } from "../store/app.actions";

export function scrollToSection(section: Links): void {
  const elem: HTMLElement | null = document.getElementById(section);
  if (elem) {
    const offsetPx: number = determineOffsetPx(section);
    window.scrollTo(0, elem.offsetTop - offsetPx);
  }
}

export function determineOffsetPx(link: Links): number {
  const offsetRatios: Record<Links, number> = {
    [Links.home]: 0.33,
    [Links.about]: 0.17,
    [Links.contact]: 0.11,
  };

  const offsetRatio = offsetRatios[link] ?? 0.11;
  return document.documentElement.clientHeight * offsetRatio;
}

export function navigateTo(store: Store, link: Links): void {
  store.dispatch(setSelectedLink({ link }));
  scrollToSection(link);
}

export function createIntersectionObserver(
  store: Store,
  component: Links,
  intersectingSections: Map<Links, IntersectionObserverEntry>
): IntersectionObserver {
  const thresholds = Array.from({ length: 21 }, (_, i) => i * 0.05);

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersectingSections.set(component, entry);
        } else {
          intersectingSections.delete(component);
        }
      });

      if (intersectingSections.size === 0) return;

      let maxRatio = 0;
      let activeSection: Links | null = null;

      intersectingSections.forEach((entry, section) => {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          activeSection = section;
        }
      });

      if (activeSection) {
        store.dispatch(setSelectedLink({ link: activeSection }));
      }
    },
    { threshold: thresholds }
  );
}

export function getPhoneLink(phone: string): string {
  return 'tel:' + phone.replace(/[^0-9+]/g, '');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}