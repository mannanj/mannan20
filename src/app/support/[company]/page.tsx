import { notFound } from 'next/navigation';
import { getCompanyIndex } from '@/lib/support-data';
import { ArticleCard } from '@/components/support/article-card';

export default async function CompanyPage({ params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  const data = await getCompanyIndex(company);
  if (!data) notFound();

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-2">{data.company}</h1>
      <p className="text-sm text-white/40 mb-8">Support articles and ticket history.</p>
      <div className="flex flex-col gap-4">
        {data.articles.map((article) => (
          <ArticleCard key={article.slug} article={article} company={company} />
        ))}
      </div>
    </>
  );
}
