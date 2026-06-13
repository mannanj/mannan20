interface DownloadPaperLinkProps {
  title: string;
  path: string;
  filename: string;
}

export function DownloadPaperLink({ title, path, filename }: DownloadPaperLinkProps) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-resume-modal', { detail: { body: `Download ${title}?`, path, filename } }))}
      className="text-accent hover:text-accent-deep leading-none h-[16px] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-colors duration-200 whitespace-nowrap flex items-center"
    >
      Download paper <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1] -mt-[1px]">&#10555;</span>
    </button>
  );
}
