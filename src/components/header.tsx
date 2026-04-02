'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { scrollToSection } from '@/lib/utils';
import type { Section } from '@/lib/types';
import { PlantIcon } from '@/components/icons/plant-icon';

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
  const [gardenExpanded, setGardenExpanded] = useState(false);
  const [gardenLevel, setGardenLevel] = useState(0);
  const [gardenRetracting, setGardenRetracting] = useState(false);
  const [rootHovered, setRootHovered] = useState(false);
  const rootHoveredRef = useRef(false);
  const gardenIntervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gardenRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!gardenExpanded) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (gardenRef.current && !gardenRef.current.contains(e.target as Node)) {
        setGardenExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [gardenExpanded]);

  const [gardenStartTime, setGardenStartTime] = useState(0);
  const [gardenRootScale, setGardenRootScale] = useState(0);
  const rootAnimRef = useRef<number>(0);

  useEffect(() => {
    if (gardenExpanded) {
      setGardenRetracting(false);
      setGardenLevel(0);
      setGardenStartTime(Date.now());
      gardenIntervalRef.current = setInterval(() => {
        setGardenLevel(prev => Math.min(prev + 1, 3));
      }, 2000);
      const startTime = Date.now();
      const FAST = 1.8;
      const CRAWL = 0.08;
      const P1_DUR = 2.2;
      const P2_DUR = 3.3;
      const P1_END = P1_DUR;
      const P2_END = P1_END + P2_DUR;
      const P1_DIST = P1_DUR * FAST;
      const P2_DIST = (FAST + CRAWL) / 2 * P2_DUR;
      const easeOutQuad = (t: number) => t * (2 - t);
      let rootBoostStart = 0;
      let rootBoostBase = 0;
      const animateRoot = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        let scale;
        if (rootHoveredRef.current) {
          if (rootBoostStart === 0) {
            rootBoostStart = elapsed;
            if (elapsed < P1_END) {
              rootBoostBase = elapsed * FAST;
            } else if (elapsed < P2_END) {
              rootBoostBase = P1_DIST + easeOutQuad((elapsed - P1_END) / P2_DUR) * P2_DIST;
            } else {
              rootBoostBase = P1_DIST + P2_DIST + (elapsed - P2_END) * CRAWL;
            }
          }
          scale = rootBoostBase + (elapsed - rootBoostStart) * FAST;
        } else {
          if (rootBoostStart > 0) {
            rootBoostStart = 0;
          }
          if (elapsed < P1_END) {
            scale = elapsed * FAST;
          } else if (elapsed < P2_END) {
            const t = (elapsed - P1_END) / P2_DUR;
            scale = P1_DIST + easeOutQuad(t) * P2_DIST;
          } else {
            scale = P1_DIST + P2_DIST + (elapsed - P2_END) * CRAWL;
          }
        }
        setGardenRootScale(scale);
        rootAnimRef.current = requestAnimationFrame(animateRoot);
      };
      rootAnimRef.current = requestAnimationFrame(animateRoot);
    } else {
      setGardenLevel(0);
      if (gardenIntervalRef.current) {
        clearInterval(gardenIntervalRef.current);
        gardenIntervalRef.current = null;
      }
      if (rootAnimRef.current) {
        cancelAnimationFrame(rootAnimRef.current);
        rootAnimRef.current = 0;
      }
      const RETRACT_DURATION = 1.5;
      const scaleAtLeave = gardenRootScale;
      if (scaleAtLeave > 0) {
        setGardenRetracting(true);
        const retractStart = Date.now();
        const easeInCubic = (t: number) => t * t * t;
        const animateRetract = () => {
          const elapsed = (Date.now() - retractStart) / 1000;
          const progress = Math.min(elapsed / RETRACT_DURATION, 1);
          setGardenRootScale(scaleAtLeave * (1 - easeInCubic(progress)));
          if (progress < 1) {
            rootAnimRef.current = requestAnimationFrame(animateRetract);
          } else {
            setGardenRootScale(0);
            setGardenRetracting(false);
            rootAnimRef.current = 0;
          }
        };
        rootAnimRef.current = requestAnimationFrame(animateRetract);
      } else {
        setGardenRootScale(0);
      }
    }
    return () => {
      if (gardenIntervalRef.current) {
        clearInterval(gardenIntervalRef.current);
        gardenIntervalRef.current = null;
      }
      if (rootAnimRef.current) {
        cancelAnimationFrame(rootAnimRef.current);
        rootAnimRef.current = 0;
      }
    };
  }, [gardenExpanded]);

  const LEAF_THRESHOLD = 1.5;
  const LEAF_CAP_THRESHOLD = 3.5;
  const BRANCH_THRESHOLD = 1.5;
  const BRANCH_LEAF_GROW_THRESHOLD = LEAF_CAP_THRESHOLD;
  const STAGE3_THRESHOLD = 5.5;

  const showLeaves = gardenRootScale >= LEAF_THRESHOLD;
  const showBranches = gardenRootScale >= BRANCH_THRESHOLD;
  const showStage3 = gardenRootScale >= STAGE3_THRESHOLD;

  const stage1LeafScale = showLeaves
    ? 1 + 2.5 * Math.min((gardenRootScale - LEAF_THRESHOLD) / (LEAF_CAP_THRESHOLD - LEAF_THRESHOLD), 1)
    : 1;
  const stage1LeafOpacity = Math.min((gardenRootScale - LEAF_THRESHOLD) * 2.5, 0.85);
  const stage2BranchProgress = showBranches
    ? Math.min((gardenRootScale - BRANCH_THRESHOLD) * 0.45, 1)
    : 0;
  const stage2LeafOpacity = showBranches
    ? Math.min((gardenRootScale - BRANCH_THRESHOLD - 0.3) * 2.5, 0.75)
    : 0;
  const stage2LeafScale = gardenRootScale >= BRANCH_LEAF_GROW_THRESHOLD
    ? 1 + 2.0 * Math.min((gardenRootScale - BRANCH_LEAF_GROW_THRESHOLD) / 1.3, 1)
    : 1;
  const stage3BranchProgress = showStage3
    ? Math.min((gardenRootScale - STAGE3_THRESHOLD) * 0.4, 1)
    : 0;
  const stage3LeafOpacity = showStage3
    ? Math.min((gardenRootScale - STAGE3_THRESHOLD - 0.3) * 2.5, 0.75)
    : 0;
  const stage3LeafScale = gardenRootScale >= STAGE3_THRESHOLD + 1.5
    ? 1 + 1.5 * Math.min((gardenRootScale - STAGE3_THRESHOLD - 1.5) / 1.5, 1)
    : 1;

  const STAGE4_THRESHOLD = 2.0;
  const showStage4 = gardenRootScale >= STAGE4_THRESHOLD;
  const stage4BranchProgress = showStage4
    ? Math.min((gardenRootScale - STAGE4_THRESHOLD) * 0.6, 1)
    : 0;
  const stage4FlowerScale = showStage4
    ? Math.min((gardenRootScale - STAGE4_THRESHOLD) / 1.5, 1)
    : 0;
  const stage4IridescentScale = showStage4
    ? Math.min((gardenRootScale - STAGE4_THRESHOLD - 0.8) / 1.5, 1)
    : 0;

  const flowerSlots = useMemo(() => {
    const tips = [
      { x: 19, y: 6, side: 'right' },
      { x: 3, y: 15, side: 'left' },
      { x: 20, y: 27, side: 'right' },
      { x: 0.5, y: 46, side: 'left' },
      { x: 17.5, y: 52, side: 'right' },
    ];
    return tips.map((tip, i) => {
      const show = Math.random() < 0.85;
      const type = Math.random() < 0.75 ? 'white' : 'iridescent';
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 1.5;
      const rotation = Math.random() * 30 - 15;
      const sizeScale = 0.65 + Math.random() * 0.25;
      return { ...tip, x: tip.x + offsetX, y: tip.y + offsetY, show, type, rotation, sizeScale, key: i };
    });
  }, [gardenStartTime]);

  const PARTICLE_COLORS = ['#ff2222', '#22dd22', '#2266ff'];
  const gardenLightOpacity = gardenExpanded ? Math.min(0.161 + gardenLevel * 0.04, 0.5) : 0.084;

  const extraParticles = useMemo(() => {
    if (!gardenExpanded) return [];
    const count = (Math.min(gardenLevel, 3) + 2) * 3;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const color = PARTICLE_COLORS[i % 3];
      const left = 14 + Math.sin(i * 2.1) * 4;
      const top = -18 - Math.cos(i * 1.7) * 5;
      const size = 1.5 + (i % 2) * 0.5;
      const duration = 1.5;
      const delay = (i * (duration / count)) % duration;
      const anim = `gardenParticleFall${(i % 3) + 1} ${duration}s linear ${delay}s infinite`;
      particles.push({ color, left, top, size, anim, key: i });
    }
    return particles;
  }, [gardenExpanded, gardenLevel]);

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
          <div className="absolute top-full left-0 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40">
            <div className="absolute -top-[6px] left-[18px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
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
      <div className={`relative flex items-center gap-4 md:pr-[15px] md:pl-[15px] transition-all duration-300 ease-out ${gardenExpanded ? 'mr-[63px]' : 'mr-[22px]'}`}>
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
      <div
        ref={gardenRef}
        data-testid="garden-wrapper"
        className={`absolute top-1/2 -translate-y-[calc(50%+2px)] z-10 transition-all duration-300 ease-out py-5 pl-7 pr-1 ${gardenExpanded ? 'right-[20px]' : 'right-[-2px]'}`}
        onMouseEnter={() => setGardenExpanded(true)}
        onMouseLeave={() => setGardenExpanded(false)}
      >
        <Link
          href="/garden"
          data-testid="header-garden-link"
          className="group relative block"
        >
          <PlantIcon
            className={`w-9 h-9 transition-all duration-300 ease-out ${gardenExpanded ? 'scale-110 group-hover:scale-[1.25]' : 'opacity-80'}`}
            centerRootClassName={`transition-all duration-300 delay-100 ${gardenExpanded ? 'opacity-0' : 'opacity-70'}`}
            potClassName={`transition-transform duration-300 ease-out ${gardenExpanded ? 'scale-x-[1.38] translate-x-[0.5px]' : ''}`}
          />
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${gardenExpanded ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute left-[5px] -top-[25px] w-[26px] h-[30px] opacity-[0.084]" style={{ background: 'linear-gradient(to bottom, transparent 0%, #f5e642 25%, #f5e642 75%, transparent 100%)', clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#e8d44d] left-[15px] -top-[23px]" style={{ animation: 'gardenParticleFall1 10.8s linear infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#f0e060] left-[18px] -top-[27px]" style={{ animation: 'gardenParticleFall2 10.8s linear 1.8s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#e8d44d] left-[16px] -top-[21px]" style={{ animation: 'gardenParticleFall3 10.8s linear 3.6s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#f0e060] left-[19px] -top-[25px]" style={{ animation: 'gardenParticleFall1 10.8s linear 5.4s infinite' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#e8d44d] left-[14px] -top-[20px]" style={{ animation: 'gardenParticleFall2 10.8s linear 7.2s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#e8d44d] left-[17px] -top-[24px]" style={{ animation: 'gardenParticleFall3 10.8s linear 9.0s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#f0e060] left-[17px] top-[20px]" style={{ animation: 'gardenParticleTravel1 10s ease-in-out 1s infinite' }} />
          </div>
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${gardenExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute left-[5px] -top-[25px] w-[26px] h-[30px] transition-opacity duration-500" style={{ opacity: gardenLightOpacity, background: 'linear-gradient(to bottom, transparent 0%, #ffe033 20%, #ffe033 80%, transparent 100%)', clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#ff2222] left-[15px] -top-[22px]" style={{ animation: 'gardenParticleFall1 1.5s linear 0s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#22dd22] left-[17px] -top-[23px]" style={{ animation: 'gardenParticleFall2 1.5s linear 0.125s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#2266ff] left-[16px] -top-[21px]" style={{ animation: 'gardenParticleFall3 1.5s linear 0.25s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#ff2222] left-[18px] -top-[24px]" style={{ animation: 'gardenParticleFall1 1.5s linear 0.375s infinite' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#22dd22] left-[14px] -top-[22px]" style={{ animation: 'gardenParticleFall2 1.5s linear 0.5s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#2266ff] left-[16px] -top-[23px]" style={{ animation: 'gardenParticleFall3 1.5s linear 0.625s infinite' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#ff2222] left-[15px] -top-[21px]" style={{ animation: 'gardenParticleFall1 1.5s linear 0.75s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#22dd22] left-[17px] -top-[24px]" style={{ animation: 'gardenParticleFall2 1.5s linear 0.875s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#2266ff] left-[18px] -top-[22px]" style={{ animation: 'gardenParticleFall3 1.5s linear 1.0s infinite' }} />
            <div className="absolute w-[2px] h-[2px] rounded-full bg-[#ff2222] left-[16px] -top-[23px]" style={{ animation: 'gardenParticleFall1 1.5s linear 1.125s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#22dd22] left-[15px] -top-[21px]" style={{ animation: 'gardenParticleFall2 1.5s linear 1.25s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#2266ff] left-[17px] -top-[24px]" style={{ animation: 'gardenParticleFall3 1.5s linear 1.375s infinite' }} />
            <div className="absolute w-[1.5px] h-[1.5px] rounded-full bg-[#ff2222] left-[16px] top-[20px]" style={{ animation: 'gardenParticleTravel1 1.5s ease-in-out 0s infinite' }} />
            {extraParticles.map(p => (
              <div key={p.key} className="absolute rounded-full" style={{ width: p.size, height: p.size, backgroundColor: p.color, left: p.left, top: p.top, animation: p.anim }} />
            ))}
          </div>
          <svg
            viewBox="0 0 20 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute top-full left-1/2 -translate-x-1/2 w-5 h-[7px] pointer-events-none transition-all duration-300 z-10 ${gardenExpanded ? 'opacity-0' : 'opacity-50'}`}
            style={{ transformOrigin: 'top center' }}
          >
            <path d="M10 0C10 1.5 10.5 3 10 5C9.8 6 10 6.5 10 7" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" fill="none" />
          </svg>
          <svg
            viewBox="0 0 20 55"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute top-full left-1/2 mt-[4px] w-5 h-[55px] z-10 ${gardenExpanded || gardenRetracting ? 'opacity-60' : 'opacity-0 pointer-events-none'}`}
            onMouseEnter={() => { setRootHovered(true); rootHoveredRef.current = true; }}
            onMouseLeave={() => { setRootHovered(false); rootHoveredRef.current = false; }}
            style={{ transformOrigin: 'top center', transform: `translateX(-50%) scaleY(${gardenRootScale})`, transition: 'opacity 0.3s ease', overflow: 'visible' }}
          >
            <defs>
              <radialGradient id="hibiscusCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffee55" />
                <stop offset="30%" stopColor="#cc1144" />
                <stop offset="70%" stopColor="#990033" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="iridescentCenter" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffee55" />
                <stop offset="30%" stopColor="#dd3388" />
                <stop offset="70%" stopColor="#8833aa" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <path d="M10 0C10 5 13 8 11 14C9 20 14 24 12 30C10 36 13 40 11 46C9.5 50 10 53 10 55" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M10 10C7 12 5 11 4 13" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M11 22C14 24 16 23 17 25" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M10 35C7 37 5 36 4 38" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M11 46C14 48 15 47 16 49" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
            {showLeaves && (
              <>
                <g transform={`translate(4, 13) scale(1, ${1 / gardenRootScale}) translate(-4, -13)`}>
                  <ellipse cx={4} cy={13} rx={1.2 * stage1LeafScale} ry={2 * stage1LeafScale} fill="#3a8a2e" opacity={stage1LeafOpacity} transform="rotate(-30, 4, 13)" />
                </g>
                <g transform={`translate(17, 25) scale(1, ${1 / gardenRootScale}) translate(-17, -25)`}>
                  <ellipse cx={17} cy={25} rx={1.2 * stage1LeafScale} ry={2 * stage1LeafScale} fill="#2d7a22" opacity={stage1LeafOpacity} transform="rotate(30, 17, 25)" />
                </g>
                <g transform={`translate(4, 38) scale(1, ${1 / gardenRootScale}) translate(-4, -38)`}>
                  <ellipse cx={4} cy={38} rx={1.2 * stage1LeafScale} ry={2 * stage1LeafScale} fill="#3a8a2e" opacity={stage1LeafOpacity} transform="rotate(-25, 4, 38)" />
                </g>
                <g transform={`translate(16, 49) scale(1, ${1 / gardenRootScale}) translate(-16, -49)`}>
                  <ellipse cx={16} cy={49} rx={1.2 * stage1LeafScale} ry={2 * stage1LeafScale} fill="#2d7a22" opacity={stage1LeafOpacity} transform="rotate(35, 16, 49)" />
                </g>
              </>
            )}
            {showBranches && (
              <>
                <path d="M10.5 16C13 17 15.5 16.5 18 18.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage2BranchProgress, 0)} />
                <path d="M10 28C7 29 4.5 28 2 30.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage2BranchProgress * 0.85, 0)} />
                <path d="M11 41C14 42 16.5 41.5 19 43.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage2BranchProgress * 0.9, 0)} />
                <path d="M10 52C7 53 4 52 1 54" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage2BranchProgress * 0.75, 0)} />
                {stage2LeafOpacity > 0 && (
                  <>
                    <g transform={`translate(18, 18.5) scale(1, ${1 / gardenRootScale}) translate(-18, -18.5)`}>
                      <ellipse cx={18} cy={18.5} rx={0.8 * stage2LeafScale} ry={1.4 * stage2LeafScale} fill="#45a035" opacity={stage2LeafOpacity} transform="rotate(25, 18, 18.5)" />
                    </g>
                    <g transform={`translate(2, 30.5) scale(1, ${1 / gardenRootScale}) translate(-2, -30.5)`}>
                      <ellipse cx={2} cy={30.5} rx={0.8 * stage2LeafScale} ry={1.4 * stage2LeafScale} fill="#3a8a2e" opacity={stage2LeafOpacity} transform="rotate(-35, 2, 30.5)" />
                    </g>
                    <g transform={`translate(19, 43.5) scale(1, ${1 / gardenRootScale}) translate(-19, -43.5)`}>
                      <ellipse cx={19} cy={43.5} rx={0.8 * stage2LeafScale} ry={1.4 * stage2LeafScale} fill="#45a035" opacity={stage2LeafOpacity} transform="rotate(20, 19, 43.5)" />
                    </g>
                    <g transform={`translate(1, 54) scale(1, ${1 / gardenRootScale}) translate(-1, -54)`}>
                      <ellipse cx={1} cy={54} rx={0.8 * stage2LeafScale} ry={1.4 * stage2LeafScale} fill="#3a8a2e" opacity={stage2LeafOpacity} transform="rotate(-30, 1, 54)" />
                    </g>
                  </>
                )}
              </>
            )}
            {showStage3 && (
              <>
                <path d="M10 7C7.5 6 5 6.5 3 8" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage3BranchProgress, 0)} />
                <path d="M10.5 19C13.5 18 16 18.5 18 20.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage3BranchProgress * 0.9, 0)} />
                <path d="M10 32C7 31 4 31.5 2 33.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage3BranchProgress * 0.85, 0)} />
                <path d="M11 38C14 37 16.5 37.5 19 39.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage3BranchProgress * 0.8, 0)} />
                <path d="M10 48C7 47 4.5 47.5 2.5 49.5" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage3BranchProgress * 0.75, 0)} />
                {stage3LeafOpacity > 0 && (
                  <>
                    <g transform={`translate(3, 8) scale(1, ${1 / gardenRootScale}) translate(-3, -8)`}>
                      <ellipse cx={3} cy={8} rx={0.7 * stage3LeafScale} ry={1.2 * stage3LeafScale} fill="#45a035" opacity={stage3LeafOpacity} transform="rotate(-20, 3, 8)" />
                    </g>
                    <g transform={`translate(18, 20.5) scale(1, ${1 / gardenRootScale}) translate(-18, -20.5)`}>
                      <ellipse cx={18} cy={20.5} rx={0.7 * stage3LeafScale} ry={1.2 * stage3LeafScale} fill="#3a8a2e" opacity={stage3LeafOpacity} transform="rotate(25, 18, 20.5)" />
                    </g>
                    <g transform={`translate(2, 33.5) scale(1, ${1 / gardenRootScale}) translate(-2, -33.5)`}>
                      <ellipse cx={2} cy={33.5} rx={0.7 * stage3LeafScale} ry={1.2 * stage3LeafScale} fill="#45a035" opacity={stage3LeafOpacity} transform="rotate(-30, 2, 33.5)" />
                    </g>
                    <g transform={`translate(19, 39.5) scale(1, ${1 / gardenRootScale}) translate(-19, -39.5)`}>
                      <ellipse cx={19} cy={39.5} rx={0.7 * stage3LeafScale} ry={1.2 * stage3LeafScale} fill="#3a8a2e" opacity={stage3LeafOpacity} transform="rotate(20, 19, 39.5)" />
                    </g>
                    <g transform={`translate(2.5, 49.5) scale(1, ${1 / gardenRootScale}) translate(-2.5, -49.5)`}>
                      <ellipse cx={2.5} cy={49.5} rx={0.7 * stage3LeafScale} ry={1.2 * stage3LeafScale} fill="#45a035" opacity={stage3LeafOpacity} transform="rotate(-25, 2.5, 49.5)" />
                    </g>
                  </>
                )}
              </>
            )}
            {showStage4 && (
              <>
                <path d="M10 4C13 2.5 16 3 19 6" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage4BranchProgress, 0)} />
                <path d="M10 13C7.5 11.5 5 12 3 15" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage4BranchProgress * 0.9, 0)} />
                <path d="M10.5 25C14 23.5 17 24 20 27" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage4BranchProgress * 0.85, 0)} />
                <path d="M10 44C6.5 43 3.5 43.5 0.5 46" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage4BranchProgress * 0.8, 0)} />
                <path d="M11 50C13.5 48.5 15 49 17.5 52" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={Math.max(1 - stage4BranchProgress * 0.75, 0)} />
                {flowerSlots.map(slot => {
                  if (!slot.show) return null;
                  const scale = slot.type === 'white' ? stage4FlowerScale : stage4IridescentScale;
                  if (scale <= 0) return null;
                  const cx = slot.x;
                  const cy = slot.y;
                  const s = scale * (slot.type === 'white' ? 2 : 2.25) * slot.sizeScale;
                  const r = slot.rotation;
                  if (slot.type === 'white') {
                    return (
                      <g key={slot.key} style={{ transform: `translate(${cx}px, ${cy}px) scaleY(${1 / gardenRootScale}) translate(${-cx}px, ${-cy}px)`, willChange: 'transform' }}>
                        <g transform={`translate(${cx}, ${cy}) scale(${s}) rotate(${r}) translate(${-cx}, ${-cy})`}>
                          <ellipse cx={cx} cy={cy - 4.5} rx={2.5} ry={4} fill="#fff5f8" opacity={0.92} transform={`rotate(0, ${cx}, ${cy})`} />
                          <ellipse cx={cx + 4.3} cy={cy - 2} rx={2.5} ry={4} fill="#fff0f5" opacity={0.88} transform={`rotate(72, ${cx}, ${cy})`} />
                          <ellipse cx={cx + 2.7} cy={cy + 3} rx={2.5} ry={4} fill="#ffe8ef" opacity={0.88} transform={`rotate(144, ${cx}, ${cy})`} />
                          <ellipse cx={cx - 2.7} cy={cy + 3} rx={2.5} ry={4} fill="#ffe8ef" opacity={0.92} transform={`rotate(216, ${cx}, ${cy})`} />
                          <ellipse cx={cx - 4.3} cy={cy - 2} rx={2.5} ry={4} fill="#fff0f5" opacity={0.88} transform={`rotate(288, ${cx}, ${cy})`} />
                          <circle cx={cx} cy={cy} r={2.2} fill="url(#hibiscusCenter)" />
                          <circle cx={cx} cy={cy} r={0.7} fill="#ffee55" opacity={0.9} />
                          <circle cx={cx - 0.5} cy={cy - 0.7} r={0.2} fill="#cc4400" />
                          <circle cx={cx + 0.2} cy={cy - 0.9} r={0.2} fill="#cc4400" />
                          <circle cx={cx + 0.7} cy={cy - 0.4} r={0.2} fill="#cc4400" />
                        </g>
                      </g>
                    );
                  }
                  return (
                    <g key={slot.key} style={{ transform: `translate(${cx}px, ${cy}px) scaleY(${1 / gardenRootScale}) translate(${-cx}px, ${-cy}px)`, willChange: 'transform' }}>
                      <g transform={`translate(${cx}, ${cy}) scale(${s}) rotate(${r}) translate(${-cx}, ${-cy})`}>
                        <ellipse cx={cx} cy={cy - 4.5} rx={2.8} ry={4.3} fill="#88aaff" opacity={0.85} transform={`rotate(5, ${cx}, ${cy})`} />
                        <ellipse cx={cx + 4.5} cy={cy - 2} rx={2.8} ry={4.3} fill="#bb88ff" opacity={0.8} transform={`rotate(77, ${cx}, ${cy})`} />
                        <ellipse cx={cx + 2.9} cy={cy + 3} rx={2.8} ry={4.3} fill="#ff88cc" opacity={0.8} transform={`rotate(149, ${cx}, ${cy})`} />
                        <ellipse cx={cx - 2.9} cy={cy + 3} rx={2.8} ry={4.3} fill="#77ccff" opacity={0.85} transform={`rotate(221, ${cx}, ${cy})`} />
                        <ellipse cx={cx - 4.5} cy={cy - 2} rx={2.8} ry={4.3} fill="#88ddee" opacity={0.8} transform={`rotate(293, ${cx}, ${cy})`} />
                        <circle cx={cx} cy={cy} r={2.5} fill="url(#iridescentCenter)" />
                        <circle cx={cx} cy={cy} r={0.8} fill="#ffee55" opacity={0.9} />
                        <circle cx={cx - 0.5} cy={cy - 0.8} r={0.25} fill="#ee4400" />
                        <circle cx={cx + 0.1} cy={cy - 1} r={0.25} fill="#ee4400" />
                        <circle cx={cx + 0.7} cy={cy - 0.6} r={0.25} fill="#ee4400" />
                        <circle cx={cx - 0.7} cy={cy - 0.4} r={0.25} fill="#ee4400" />
                      </g>
                    </g>
                  );
                })}
              </>
            )}
          </svg>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute left-[0px] bottom-[2px] w-5 h-5 transition-all duration-300 delay-100 pointer-events-none ${gardenExpanded ? 'opacity-80 scale-100' : 'opacity-0 scale-75'}`}
          >
            <path d="M8 14V9" stroke="#4a7c3f" strokeWidth="1" strokeLinecap="round" />
            <path d="M8 11C6 9.5 4 7.5 5.5 5C7 2.5 8 6 8 8" stroke="#4a7c3f" strokeWidth="1" strokeLinecap="round" fill="#4a7c3f" />
            <path d="M8 10C10 8.5 12 6.5 10.5 4C9 1.5 8 5 8 7" stroke="#2d5a27" strokeWidth="1" strokeLinecap="round" fill="#2d5a27" />
            <ellipse cx="8" cy="14.5" rx="3" ry="0.8" fill="#6b4423" />
            <polygon points="5.5,14.5 6.5,18 9.5,18 10.5,14.5" fill="#6b4423" />
            <polygon points="5.8,14.5 6.7,17.8 9.3,17.8 10.2,14.5" fill="#5a3a1a" />
          </svg>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute right-[4px] bottom-[5px] w-3 h-3 transition-all duration-300 delay-150 pointer-events-none ${gardenExpanded ? 'opacity-70 scale-100' : 'opacity-0 scale-75'}`}
          >
            <path d="M8 14V10" stroke="#5a9c4f" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M8 12C6.5 10.5 5 8.5 6.5 6.5C8 4.5 8 7.5 8 9" stroke="#5a9c4f" strokeWidth="1" strokeLinecap="round" fill="#5a9c4f" />
            <path d="M8 11C9.5 9.5 11 7.5 9.5 5.5C8 3.5 8 6.5 8 8" stroke="#3d7a32" strokeWidth="1" strokeLinecap="round" fill="#3d7a32" />
            <ellipse cx="8" cy="14.5" rx="2.5" ry="0.7" fill="#6b4423" />
            <polygon points="6,14.5 7,17.5 9,17.5 10,14.5" fill="#6b4423" />
            <polygon points="6.3,14.5 7.2,17.3 8.8,17.3 9.7,14.5" fill="#5a3a1a" />
          </svg>
          <div className={`absolute top-full right-0 mt-3 transition-opacity duration-200 pointer-events-none ${gardenExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute -top-[6px] right-[10px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#333]" />
            <div className="bg-[#333] text-white text-xs px-4 py-2 rounded-full whitespace-nowrap">
              View my Garden
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
