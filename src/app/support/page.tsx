import { getSupportIndex } from '@/lib/support-data';
import { CompanyCard } from '@/components/support/company-card';

export default async function SupportPage() {
  const data = await getSupportIndex();

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-2">Support</h1>
      <p className="text-sm text-white/40 mb-8">Documented support cases and correspondence.</p>
      <div className="flex flex-col gap-4">
        {data.companies.map((company) => (
          <CompanyCard key={company.slug} company={company} />
        ))}
      </div>
    </>
  );
}
