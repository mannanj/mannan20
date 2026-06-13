'use client';

import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#222] rounded-xl max-w-[728px] max-h-[min(90vh,800px)] w-fit p-5 relative shadow-[0_8px_30px_rgba(0,0,0,0.6)] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-[5px] right-[5px] bg-transparent border-0 text-2xl cursor-pointer text-[#888] leading-none p-0 w-8 h-8 flex items-center justify-center transition-colors duration-200 hover:text-white outline-none shadow-none"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="mt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
