import type { PublishedWork } from '@/lib/types';

interface PublishedWorksSectionProps {
  publishedWorks: PublishedWork[];
}

export function PublishedWorksSection({ publishedWorks }: PublishedWorksSectionProps) {
  return (
    <>
      <h2 id="published-works" className="scroll-mt-[75px] text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Published Works
      </h2>
      {publishedWorks.map((work, i) => (
        <div key={i} className="p-0 m-0 text-inherit mt-[15px]">
          <b>{work.title}</b>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-resume-modal', { detail: { body: `Download the paper ${work.title}?`, path: work.downloadPath, filename: work.downloadFilename } }))}
              className="text-[#039be5] hover:text-[#4fc3f7] text-[11px] leading-none h-[16px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap flex items-center"
            >
              Download paper <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1] -mt-[1px]">&#10555;</span>
            </button>
            {work.demoUrl && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-video-popout', { detail: work.demoUrl }))}
                className="text-[#039be5] hover:text-[#4fc3f7] text-[11px] leading-none h-[16px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap flex items-center gap-1"
              >
                Watch demo
                <svg width="10" height="10" viewBox="0 0 10 10" className="relative top-[0.5px]">
                  <polygon points="1,0 10,5 1,10" fill="black" />
                  <polygon points="2,1.5 8.5,5 2,8.5" fill="#039be5" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-xs mt-0 leading-[1.6] m-0 text-white">{work.description}</p>
        </div>
      ))}
    </>
  );
}
