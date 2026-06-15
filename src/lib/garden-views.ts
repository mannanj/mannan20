export const GARDEN_VIEW_ACCENTS = {
  "health-longevity": "#7bb86a",
  "seeking-community": "#4fc3f7",
  "self-parenting": "#e8b08a",
  "ai-false-positives": "#e0b341",
  taken: "#ff5d5d",
  "funny-frustrations": "#d97757",
} as const;

export type GardenViewSlug = keyof typeof GARDEN_VIEW_ACCENTS;

export const GARDEN_VIEW_SLUGS = Object.keys(
  GARDEN_VIEW_ACCENTS,
) as GardenViewSlug[];

export function isGardenViewSlug(value: string): value is GardenViewSlug {
  return Object.prototype.hasOwnProperty.call(GARDEN_VIEW_ACCENTS, value);
}
