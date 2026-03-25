'use client';

import { useRef, useEffect } from 'react';

interface CursorHideProps {
  active: boolean;
}

export function CursorHide({ active }: CursorHideProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (active) {
      if (!styleRef.current) {
        const style = document.createElement('style');
        style.textContent = '* { cursor: none !important; }';
        document.head.appendChild(style);
        styleRef.current = style;
      }
    } else {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    }

    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [active]);

  return null;
}
