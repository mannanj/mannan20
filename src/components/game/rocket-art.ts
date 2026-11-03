export interface ArtPlacement {
  left?: number;
  top?: number;
  width: number;
  height: number;
}

export const ROCKET_ART = {
  body: { left: -20.3, top: -58, width: 111, height: 237 },
  open: { left: -20.3, top: -57.9, width: 113, height: 237 },
  legs: { left: -60.3, top: -57.9, width: 191, height: 245 },
  plume: { width: 100, height: 267 },
} as const;
