'use client';

import Image from 'next/image';
import { useApp } from '@/context/app-context';
import { scrollToSection } from '@/lib/utils';
import type { Section } from '@/lib/types';

const LINKS: Section[] = ['home', 'about', 'contact'];

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
      <div className="flex pr-[50px] pl-[15px]">
        {LINKS.map((link) => (
          <div key={link} className="pl-[15px]">
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
