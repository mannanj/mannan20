export interface HandColor {
  id: string;
  name: string;
  fill: string;
  shade: string;
  palm: string;
}

export const DEFAULT_HAND_COLOR = 'tan';
export const HAND_COLOR_KEY = 'chicken-hand-color';

export const HAND_COLORS: HandColor[] = [
  { id: 'tan', name: 'Tan', fill: '#F2B279', shade: '#c98f5c', palm: '#EFA76C' },
  { id: 'light', name: 'Light', fill: '#F8DCC0', shade: '#d9b08c', palm: '#F2CDA8' },
  { id: 'brown', name: 'Brown', fill: '#9A6236', shade: '#6e4322', palm: '#8A562E' },
  { id: 'gold', name: 'Gold', fill: '#FFD84D', shade: '#c9a21c', palm: '#F5C93A' },
  { id: 'blue', name: 'Blue', fill: '#8DB8F2', shade: '#5a86c4', palm: '#7AA8E8' },
  { id: 'pink', name: 'Pink', fill: '#F6A6C8', shade: '#c9729a', palm: '#EE93BA' },
  { id: 'green', name: 'Green', fill: '#97DB9A', shade: '#5fa863', palm: '#86CF8A' },
];

const OPEN_HAND = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='78' height='78' viewBox='0 0 40 40'%3E%3Cg stroke='%234a2e1a' stroke-width='1.6' stroke-linejoin='round' stroke-linecap='round'%3E%3Cpath d='M12 23 Q10.6 15.5 13.6 14.2 Q15.6 13.4 16.6 15 L16.6 10.6 Q16.6 8.2 18.6 8.2 Q20.6 8.2 20.6 10.6 L20.6 9 Q20.6 6.6 22.6 6.6 Q24.6 6.6 24.6 9 L24.6 10.8 Q24.6 8.8 26.4 8.8 Q28.4 8.8 28.4 11.2 L28.4 15.4 Q29.8 14 31.2 15.6 Q32.6 17.4 30.8 20 L26.2 26.6 Q24.2 29.6 20 29.6 Q15 29.6 13.2 26 Z' fill='%23F2B279'/%3E%3Cpath d='M20.6 10.6 L20.6 16.2 M24.6 10.8 L24.6 16.4 M28.4 13.2 L27.8 17.2' fill='none' stroke='%23c98f5c' stroke-width='1.3'/%3E%3C/g%3E%3C/svg%3E";
const PRESSED_HAND = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='78' height='78' viewBox='0 0 40 40'%3E%3Cg stroke='%234a2e1a' stroke-width='1.6' stroke-linejoin='round' stroke-linecap='round'%3E%3Cpath d='M11 25 Q10 19 13 17.5 Q14 14.4 17 15 Q18.5 13 21 14 Q23 12.4 25.4 14 Q28.6 13.4 29.6 16.8 Q31 21 29 26 Q27.6 31 20.5 31.6 Q13.5 31.6 11 25 Z' fill='%23F2B279'/%3E%3Cpath d='M17 15 L17 19.4 M21 14 L21 19 M25.4 14 L25.4 19.4' fill='none' stroke='%23c98f5c' stroke-width='1.3'/%3E%3Cpath d='M12.4 22 Q17.4 19.8 23 22 Q24.4 23.4 22.6 24.6 Q16.6 26 13 26' fill='%23EFA76C'/%3E%3C/g%3E%3C/svg%3E";
const HOT_SPOT = '39 36';

function tint(svg: string, c: HandColor): string {
  return svg.replaceAll('%23F2B279', encodeURIComponent(c.fill)).replaceAll('%23c98f5c', encodeURIComponent(c.shade)).replaceAll('%23EFA76C', encodeURIComponent(c.palm));
}

export const HAND_CURSOR_CSS = HAND_COLORS.filter((c) => c.id !== DEFAULT_HAND_COLOR)
  .map(
    (c) =>
      `.chicken-hand-cursor[data-hand="${c.id}"]{cursor:url("${tint(OPEN_HAND, c)}") ${HOT_SPOT},pointer}.chicken-hand-cursor[data-hand="${c.id}"]:active{cursor:url("${tint(PRESSED_HAND, c)}") ${HOT_SPOT},pointer}`
  )
  .join('');

export function handColor(id: string): HandColor {
  return HAND_COLORS.find((c) => c.id === id) ?? HAND_COLORS[0];
}
