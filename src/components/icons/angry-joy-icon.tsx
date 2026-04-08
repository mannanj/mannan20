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
          <radialGradient id="face-grad" cx="50%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#ffaa33" />
            <stop offset="40%" stopColor="#ff6622" />
            <stop offset="100%" stopColor="#cc2200" />
          </radialGradient>
          <radialGradient id="face-highlight" cx="50%" cy="25%" r="40%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tear-grad" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#b8e4ff" />
            <stop offset="100%" stopColor="#5bbfef" />
          </radialGradient>
          <filter id="tear-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#3a8abf" floodOpacity="0.3" />
          </filter>
        </defs>

        <circle cx="50" cy="50" r="46" fill="url(#face-grad)" />
        <circle cx="50" cy="50" r="46" fill="url(#face-highlight)" />

        <path d="M 24 32 Q 31 28 38 34" fill="#6b2a1a" stroke="none" />
        <path d="M 62 34 Q 69 28 76 32" fill="#6b2a1a" stroke="none" />

        <path d="M 28 44 Q 33 40 38 44 Q 33 48 28 44 Z" fill="#6b2a1a" />
        <path d="M 62 44 Q 67 40 72 44 Q 67 48 62 44 Z" fill="#6b2a1a" />

        <path d="M 34 60 Q 50 54 66 60" fill="none" stroke="#6b2a1a" strokeWidth="2.5" strokeLinecap="round" />

        <path
          d="M 10 46 Q 14 36 22 44 Q 16 52 10 46 Z"
          fill="url(#tear-grad)"
          filter="url(#tear-shadow)"
        />
        <ellipse cx="15" cy="43" rx="2.5" ry="1.5" fill="white" opacity="0.5" />

        <path
          d="M 90 46 Q 86 36 78 44 Q 84 52 90 46 Z"
          fill="url(#tear-grad)"
          filter="url(#tear-shadow)"
        />
        <ellipse cx="85" cy="43" rx="2.5" ry="1.5" fill="white" opacity="0.5" />
      </svg>

      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="small-tear-grad" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#b8e4ff" />
            <stop offset="100%" stopColor="#5bbfef" />
          </radialGradient>
        </defs>
        <style>{`
          .tear-l1, .tear-l2, .tear-l3,
          .tear-r1, .tear-r2, .tear-r3 {
            opacity: 0;
          }
          .tear-l1.active, .tear-r1.active {
            animation: tearfall 1.5s ease-in forwards;
          }
          .tear-l2.active, .tear-r2.active {
            animation: tearfall 1.5s ease-in 0.25s forwards;
          }
          .tear-l3.active, .tear-r3.active {
            animation: tearfall 1.5s ease-in 0.5s forwards;
          }
          @keyframes tearfall {
            0% { opacity: 0.8; transform: translateY(0); }
            80% { opacity: 0.4; }
            100% { opacity: 0; transform: translateY(35px); }
          }
        `}</style>

        <g key={tearCycle ? 'a' : 'b'}>
          <circle className="tear-l1 active" cx="12" cy="52" r="2.5" fill="url(#small-tear-grad)" />
          <circle className="tear-l2 active" cx="16" cy="54" r="2" fill="url(#small-tear-grad)" />
          <circle className="tear-l3 active" cx="10" cy="55" r="1.5" fill="url(#small-tear-grad)" />

          <circle className="tear-r1 active" cx="88" cy="52" r="2.5" fill="url(#small-tear-grad)" />
          <circle className="tear-r2 active" cx="84" cy="54" r="2" fill="url(#small-tear-grad)" />
          <circle className="tear-r3 active" cx="90" cy="55" r="1.5" fill="url(#small-tear-grad)" />
        </g>
      </svg>
    </div>
  );
}
