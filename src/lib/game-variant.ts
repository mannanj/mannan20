export const GAME_VARIANT_PARAM = 'variant';
export const NEXT_GAME_VARIANT = '2';

export function isNextGameVariant(value: string | string[] | undefined): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === NEXT_GAME_VARIANT;
}
