'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
      <circle cx="12" cy="12" r="12" fill="#0b0b0b" />
      <path
        fill="white"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-5 h-5"
    >
      <path
        fill="white"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      />
    </svg>
  );
}

export function Header() {
  const { state } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [clicksAllowed, setClicksAllowed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gateTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const CLICK_GATE_MS = 1000;

  useEffect(() => {
    if (expanded) {
      setClicksAllowed(false);
      gateTimerRef.current = setTimeout(() => setClicksAllowed(true), CLICK_GATE_MS);
    } else {
      setClicksAllowed(false);
      if (gateTimerRef.current) clearTimeout(gateTimerRef.current);
    }
    return () => {
      if (gateTimerRef.current) clearTimeout(gateTimerRef.current);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [expanded]);

  const goTo = (link: Section) => {
    scrollToSection(link);
  };

  const gatedClick = useCallback((e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (!clicksAllowed) {
      e.preventDefault();
      e.stopPropagation();
      if (!expanded) setExpanded(true);
    }
  }, [clicksAllowed, expanded]);

  return (
    <div className="flex justify-between items-center fixed top-0 w-screen bg-[#0b0b0b] border-b border-white h-[66px] z-[99] px-4">
      <div
        ref={containerRef}
        data-testid="header-controls"
        className="relative flex items-center pr-[60px]"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <button
          type="button"
          data-testid="header-home-button"
          onClick={() => {
            setExpanded((prev) => !prev);
            scrollToSection('home');
          }}
          className="group relative z-30 bg-transparent border-none cursor-pointer p-0 transition-transform duration-200 hover:scale-110 active:scale-100"
        >
          <Image src="/mannan.jpg" width={48} height={48} alt="Mannan" className="rounded-full" />
          <div className="absolute top-full left-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40">
            <div className="absolute -top-[6px] left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
            <div className="bg-[#333] text-white text-xs px-4 py-2 rounded-full whitespace-nowrap">
              Return to Home
            </div>
          </div>
        </button>
        <a
          href="https://www.linkedin.com/in/mannanjavid/"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="header-linkedin-link"
          onClick={gatedClick}
          className={`group absolute z-20 top-1/2 -translate-y-1/2 transition-all duration-300 ease-out hover:scale-[1.35] active:scale-110 ${expanded ? 'left-[56px] max-md:left-[60px] max-md:scale-[1.3]' : 'left-[44px]'}`}
        >
          <LinkedInIcon />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
            <div className="bg-[#333] text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap">
              View my LinkedIn
            </div>
          </div>
        </a>
        <a
          href="https://github.com/mannanj"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="header-github-link"
          onClick={gatedClick}
          className={`group absolute z-10 top-1/2 -translate-y-1/2 transition-all duration-300 ease-out hover:scale-[1.35] active:scale-110 ${expanded ? 'left-[80px] max-md:left-[90px] max-md:scale-[1.3]' : 'left-[57px]'}`}
        >
          <GitHubIcon />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
            <div className="bg-[#333] text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap">
              View my GitHub
            </div>
          </div>
        </a>
      </div>
      <div className="relative flex items-center gap-4 md:pr-[15px] md:pl-[15px]">
        {LINKS.map((link) => (
          <div key={link} className="pl-[15px] md:pl-[15px]">
            <a
              id={`${link}-link`}
              data-testid={`header-nav-${link}`}
              className={`header-link ${state.activeSection === link ? 'header-link-selected' : ''}`}
              onClick={() => goTo(link)}
            >
              {link.charAt(0).toUpperCase() + link.slice(1)}
            </a>
          </div>
        ))}
      </div>
      <Link
        href="/garden"
        data-testid="header-garden-link"
        className="group absolute right-4 top-1/2 -translate-y-1/2"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110"
        >
          <path d="M12 22V12" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 15C8 12 4 8 7 4C10 0 12 6 12 10" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M12 12C16 9 20 5 17 1C14 -3 12 3 12 7" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
          <div className="bg-[#333] text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap">
            Garden
          </div>
        </div>
      </Link>
    </div>
  );
}
