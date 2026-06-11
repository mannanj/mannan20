'use client';

import { useEffect } from 'react';

interface BottomSheetProps {
  id: string;
  open: boolean;
  onClose: () => void;
  label: string;
  testId: string;
  children: React.ReactNode;
}

export function BottomSheet({ id, open, onClose, label, testId, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      id={id}
      data-testid={testId}
      role="region"
      aria-label={label}
      aria-hidden={!open}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#121214]/95 backdrop-blur-md transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
    >
      <div className="mx-auto max-h-[60vh] w-full max-w-5xl overflow-y-auto px-6 py-5">
        {children}
      </div>
    </div>
  );
}
