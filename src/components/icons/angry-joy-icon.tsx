'use client';

import { useEffect, useState } from 'react';

export function AngryJoyIcon({ size = 44 }: { size?: number }) {
  const [tearCycle, setTearCycle] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTearCycle((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="face-grad" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#c0392b" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="46" fill="url(#face-grad)" />

        <g>
          <line x1="22" y1="28" x2="38" y2="35" stroke="#4a1a1a" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="62" y1="35" x2="78" y2="28" stroke="#4a1a1a" strokeWidth="3.5" strokeLinecap="round" />
        </g>

        <circle cx="34" cy="42" r="4.5" fill="#4a1a1a" />
        <circle cx="66" cy="42" r="4.5" fill="#4a1a1a" />

        <circle cx="35.5" cy="41" r="1.5" fill="white" opacity="0.6" />
        <circle cx="67.5" cy="41" r="1.5" fill="white" opacity="0.6" />

        <path
          d="M 30 68 Q 50 80 70 68"
          fill="none"
          stroke="#4a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <rect x="38" y="65" width="24" height="10" rx="2" fill="white" opacity="0.9" />
      </svg>

      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          .tear-left-1, .tear-left-2, .tear-left-3,
          .tear-right-1, .tear-right-2, .tear-right-3 {
            opacity: 0;
          }
          .tear-left-1.active, .tear-right-1.active {
            animation: tearfall 1.5s ease-in forwards;
          }
          .tear-left-2.active, .tear-right-2.active {
            animation: tearfall 1.5s ease-in 0.25s forwards;
          }
          .tear-left-3.active, .tear-right-3.active {
            animation: tearfall 1.5s ease-in 0.5s forwards;
          }
          @keyframes tearfall {
            0% { opacity: 0.9; transform: translateY(0); }
            80% { opacity: 0.6; }
            100% { opacity: 0; transform: translateY(40px); }
          }
        `}</style>

        <g key={tearCycle ? 'a' : 'b'}>
          <circle className={`tear-left-1 active`} cx="28" cy="50" r="3" fill="#5bcefa" />
          <circle className={`tear-left-2 active`} cx="32" cy="52" r="2.5" fill="#5bcefa" />
          <circle className={`tear-left-3 active`} cx="25" cy="53" r="2" fill="#5bcefa" />

          <circle className={`tear-right-1 active`} cx="72" cy="50" r="3" fill="#5bcefa" />
          <circle className={`tear-right-2 active`} cx="68" cy="52" r="2.5" fill="#5bcefa" />
          <circle className={`tear-right-3 active`} cx="75" cy="53" r="2" fill="#5bcefa" />
        </g>
      </svg>
    </div>
  );
}
