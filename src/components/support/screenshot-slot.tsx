import Image from 'next/image';
import type { Screenshot } from '@/lib/support-types';

export function ScreenshotSlot({ screenshot }: { screenshot: Screenshot }) {
  if (screenshot.path) {
    return (
      <figure className="rounded-xl overflow-hidden border border-white/10">
        <Image src={screenshot.path} alt={screenshot.caption} width={680} height={400} className="w-full h-auto" />
        <figcaption className="px-4 py-3 text-xs text-white/40 bg-white/[0.03]">{screenshot.caption}</figcaption>
      </figure>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-white/10 p-8 flex items-center justify-center">
      <p className="text-sm text-white/25 text-center">{screenshot.caption}</p>
    </div>
  );
}
