import { redirect } from 'next/navigation';

export default async function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string }>;
}) {
  const { showAll } = await searchParams;
  redirect(showAll === 'true' ? '/garden?showAll=true#readings' : '/garden#readings');
}
