'use client';

import Image from 'next/image';
import { useApp } from '@/context/app-context';
import { scrollToSection } from '@/lib/utils';
import type { Section } from '@/lib/types';

const LINKS: Section[] = ['home', 'about', 'contact'];

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-5 h-5"
    >
      <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="#0b0b0b" stroke="white" strokeWidth="1" />
      <path
        fill="white"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
      />
    </svg>
  );
}

export function Header() {
  const { state } = useApp();

  const goTo = (link: Section) => {
    scrollToSection(link);
  };

  return (
    <div className="flex justify-between items-center fixed top-0 w-screen bg-[#0b0b0b] border-b border-white h-[66px] z-[99] px-4">
      <div className="flex items-center relative z-[-99] hover:cursor-pointer">
        <Image src="/mannan.jpg" width={48} height={48} alt="Mannan" className="rounded-full" />
      </div>
      <a
        href="https://www.linkedin.com/in/mannanjavid/"
        target="_blank"
        rel="noopener noreferrer"
        className="group absolute left-1/2 -translate-x-1/2 transition-transform duration-200 hover:scale-125 active:scale-110 md:block hidden"
      >
        <LinkedInIcon />
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
          <div className="bg-[#333] text-white text-xs px-4 py-2 rounded-full whitespace-nowrap">
            View my LinkedIn
          </div>
        </div>
      </a>
      <div className="flex items-center gap-4 md:pr-[50px] md:pl-[15px]">
        <a
          href="https://www.linkedin.com/in/mannanjavid/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative transition-transform duration-200 hover:scale-125 active:scale-110 md:hidden"
        >
          <LinkedInIcon />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
            <div className="bg-[#333] text-white text-xs px-4 py-2 rounded-full whitespace-nowrap">
              View my LinkedIn
            </div>
          </div>
        </a>
        {LINKS.map((link) => (
          <div key={link} className="pl-[15px] md:pl-[15px]">
            <a
              id={`${link}-link`}
              className={`header-link ${state.activeSection === link ? 'header-link-selected' : ''}`}
              onClick={() => goTo(link)}
            >
              {link.charAt(0).toUpperCase() + link.slice(1)}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
