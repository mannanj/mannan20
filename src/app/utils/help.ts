import { Links } from "../models/models";

export function scrollToSection(section: Links): void {
  const elem: HTMLElement | null = document.getElementById(section);
  if (elem) {
    const offsetPx: number = determineOffsetPx(section);
    window.scrollTo(0, elem.offsetTop - offsetPx);
  }
}

export function determineOffsetPx(link: Links): number {
  let offsetRatio;
  switch(link) { 
    case Links.home: {
      offsetRatio = 0.33;
      break; 
    }
    case Links.about: {
      offsetRatio = 0.22;
      break; 
    }
    case Links.resume: {
      offsetRatio = 0.17;
      break; 
    }
    case Links.contact: {
      offsetRatio = 0.11;
      break; 
    }
    default: {
      offsetRatio = 0.11;
      break; 
    }
  }
  return document.documentElement.clientHeight * offsetRatio;
}