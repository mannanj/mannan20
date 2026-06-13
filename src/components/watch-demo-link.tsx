interface WatchDemoLinkProps {
  url: string;
}

export function WatchDemoLink({ url }: WatchDemoLinkProps) {
  return (
    <button
      data-testid="watch-demo-btn"
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-video-popout', { detail: url }))}
      style={{ fontSize: 11 }}
      className="text-[#039be5] hover:text-[#4fc3f7] leading-none h-[16px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap flex items-center gap-1"
    >
      Watch demo
      <svg width="10" height="10" viewBox="0 0 10 10" className="relative top-[0.5px]">
        <polygon points="1,0 10,5 1,10" fill="white" />
        <polygon points="2,1.5 8.5,5 2,8.5" fill="#039be5" />
      </svg>
    </button>
  );
}
