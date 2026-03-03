import Link from 'next/link';
import type { SupportCompany } from '@/lib/support-types';

export function CompanyCard({ company }: { company: SupportCompany }) {
  return (
    <Link href={`/support/${company.slug}`} className="block group">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]">
        <h2 className="text-lg font-semibold text-white group-hover:text-[#4fc3f7] transition-colors">
          {company.name}
        </h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{company.description}</p>
        <p className="mt-3 text-xs text-white/30">
          {company.articleCount} {company.articleCount === 1 ? 'article' : 'articles'}
        </p>
      </div>
    </Link>
  );
}
