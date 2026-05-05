export interface ScheduleType {
  slug: string;
  label: string;
  blurb: string;
  enabled: boolean;
}

export const SCHEDULE_TYPES: ScheduleType[] = [
  {
    slug: 'example-demo',
    label: 'Example',
    blurb: 'Walk through the booking flow with mock data.',
    enabled: true,
  },
  {
    slug: 'friend',
    label: 'Friend',
    blurb: 'Catch up, no agenda.',
    enabled: false,
  },
  {
    slug: 'existing-client',
    label: 'Client',
    blurb: 'Check-in or weekly availability for ongoing work.',
    enabled: false,
  },
  {
    slug: 'new-project',
    label: 'New',
    blurb: 'Defined scope. Optional discovery call.',
    enabled: false,
  },
  {
    slug: 'discovery',
    label: 'Discovery',
    blurb: 'Scope is fuzzy — let’s figure it out together.',
    enabled: false,
  },
  {
    slug: 'vibe-code',
    label: 'Vibe Code',
    blurb: 'Flat $300 research fee, then hourly. AI-assisted intake.',
    enabled: false,
  },
];

export function getTypeBySlug(slug: string | undefined): ScheduleType | null {
  if (!slug) return null;
  return SCHEDULE_TYPES.find((t) => t.slug === slug) ?? null;
}
