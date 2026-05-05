import { Suspense } from 'react';
import { ScheduleFlow } from '@/components/schedule/schedule-flow';

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <Suspense fallback={null}>
      <ScheduleFlow initialTypeSlug={type} />
    </Suspense>
  );
}
