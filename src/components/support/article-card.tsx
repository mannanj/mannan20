import Link from 'next/link';
import type { SupportArticleSummary } from '@/lib/support-types';
import { StatusBadge } from './status-badge';

export function ArticleCard({ article, company }: { article: SupportArticleSummary; company: string }) {
  return (
    <Link href={`/support/${company}/${article.slug}`} className="block group">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]">
        <div className="flex items-center gap-3 mb-3">
          <StatusBadge status={article.status} />
          <span className="text-xs text-white/30 font-mono">#{article.ticketNumber}</span>
        </div>
        <h3 className="text-base font-semibold text-white group-hover:text-[#4fc3f7] transition-colors">
          {article.title}
        </h3>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{article.summary}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-white/30">
          <span>Opened {article.dateOpened}</span>
          {article.dateClosed && <span>Closed {article.dateClosed}</span>}
        </div>
      </div>
    </Link>
  );
}
