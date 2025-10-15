export function formatCompletionDate(isoDate: string): string {
  const date = new Date(isoDate);

  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? 'p' : 'a';

  const timeStr = minutes === 0
    ? `${hour12}${period}`
    : `${hour12}${minutes.toString().padStart(2, '0')}${period}`;

  return `${month} ${day}, ${year} ${timeStr}`;
}
