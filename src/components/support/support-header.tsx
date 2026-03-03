'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function SupportHeader() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0b0b]/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[680px] mx-auto px-6 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span className="text-white/20">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-white/60 truncate">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-white/40 hover:text-white/70 transition-colors truncate">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors whitespace-nowrap ml-4">
          Back to Home
        </Link>
      </div>
    </header>
  );
}
