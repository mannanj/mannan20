'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent | TouchEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open, close]);

  const signOut = async () => {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[0.9375rem] text-[#1a56db] hover:text-[#143fa8]"
      >
        <span className="max-w-[16rem] truncate" title={email}>
          {email}
        </span>
        <svg
          viewBox="0 0 16 16"
          width={11}
          height={11}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+6px)] right-0 z-20 flex min-w-[12rem] flex-col rounded-[9px] border border-[#ddd] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <span
            role="menuitem"
            aria-disabled="true"
            className="cursor-not-allowed rounded-md px-3 py-2 text-left text-[0.9375rem] text-[#a8a8a8]"
          >
            MCP Connector
          </span>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="cursor-pointer rounded-md border-0 bg-transparent px-3 py-2 text-left text-[0.9375rem] text-[#0b0b0b] hover:bg-[#f3f3f3]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
