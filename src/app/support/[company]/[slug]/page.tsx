import { notFound } from 'next/navigation';
import { getArticle } from '@/lib/support-data';
import { StatusBadge } from '@/components/support/status-badge';
import { Timeline } from '@/components/support/timeline';
import { ScreenshotSlot } from '@/components/support/screenshot-slot';

export default async function ArticlePage({ params }: { params: Promise<{ company: string; slug: string }> }) {
  const { company, slug } = await params;
  const article = await getArticle(company, slug);
  if (!article) notFound();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={article.status} />
          <span className="text-xs text-white/30 font-mono">#{article.ticketNumber}</span>
          <span className="text-xs text-white/30">{article.platform}</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{article.title}</h1>
        <div className="flex items-center gap-4 text-xs text-white/30">
          <span>Opened {article.dateOpened}</span>
          {article.dateClosed && <span>Closed {article.dateClosed}</span>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">User Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-white/30 text-xs block mb-1">Username</span>
            <span className="text-white font-mono">{article.userInfo.username}</span>
          </div>
          <div>
            <span className="text-white/30 text-xs block mb-1">Email</span>
            <span className="text-white font-mono">{article.userInfo.email}</span>
          </div>
          <div>
            <span className="text-white/30 text-xs block mb-1">User ID</span>
            <span className="text-white font-mono">{article.userInfo.userId}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Problem Summary</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-4">{article.problemSummary.description}</p>
        <div className="mb-4">
          <h3 className="text-xs text-white/40 mb-2 font-medium">Symptoms</h3>
          <ul className="space-y-2">
            {article.problemSummary.symptoms.map((symptom, i) => (
              <li key={i} className="text-sm text-white/60 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-white/30">
                {symptom}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs text-white/40 mb-2 font-medium">Root Cause</h3>
          <p className="text-sm text-white/60 leading-relaxed">{article.problemSummary.rootCause}</p>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-6">Timeline</h2>
        <Timeline entries={article.timeline} />
      </section>

      {article.screenshots.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Screenshots</h2>
          <div className="flex flex-col gap-4">
            {article.screenshots.map((screenshot, i) => (
              <ScreenshotSlot key={i} screenshot={screenshot} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-3">Current Status</h2>
        <p className="text-sm text-white/70 font-medium mb-2">{article.currentStatus.summary}</p>
        <p className="text-sm text-white/50 leading-relaxed">{article.currentStatus.details}</p>
      </section>
    </div>
  );
}
