interface WatchDemoLinkProps {
  url: string;
}

export function WatchDemoLink({ url }: WatchDemoLinkProps) {
  return (
    <button
      data-testid="watch-demo-btn"
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-video-popout', { detail: url }))}
      className="text-accent hover:text-accent-deep leading-none h-[16px] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-colors duration-200 whitespace-nowrap flex items-center gap-1"
    >
      Watch demo
      <svg width="9" height="9" viewBox="0 0 10 10" className="relative top-[0.5px]">
        <polygon points="1,0 10,5 1,10" fill="currentColor" />
      </svg>
    </button>
  );
}
