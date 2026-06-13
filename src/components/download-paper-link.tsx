interface DownloadPaperLinkProps {
  title: string;
  path: string;
  filename: string;
}

export function DownloadPaperLink({ title, path, filename }: DownloadPaperLinkProps) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-resume-modal', { detail: { body: `Download the paper ${title}?`, path, filename } }))}
      style={{ fontSize: 11 }}
      className="text-[#039be5] hover:text-[#4fc3f7] leading-none h-[16px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap flex items-center"
    >
      Download paper <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1] -mt-[1px]">&#10555;</span>
    </button>
  );
}
