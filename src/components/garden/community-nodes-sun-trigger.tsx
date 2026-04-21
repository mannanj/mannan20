"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CommunityNodesSun = dynamic(() => import("./community-nodes-sun"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  x: number;
  y: number;
  size: number;
  onDone: () => void;
}

const SHOW_DURATION_MS = 10000;
const FADE_MS = 400;

export function CommunityNodesSunTrigger({ x, y, size, onDone }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let loadCancel = false;
    import("./community-nodes-sun").then(() => {
      if (!loadCancel) setLoaded(true);
    });
    return () => {
      loadCancel = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const fadeTimer = window.setTimeout(() => setFadingOut(true), SHOW_DURATION_MS - FADE_MS);
    const doneTimer = window.setTimeout(onDone, SHOW_DURATION_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [loaded, onDone]);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    pointerEvents: "none",
    opacity: fadingOut ? 0 : 1,
    transition: `opacity ${FADE_MS}ms ease-out`,
  };

  return (
    <div style={wrapperStyle}>
      {!loaded ? (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div
            className="rounded-full border border-white/40 border-t-transparent animate-spin"
            style={{ width: size * 0.35, height: size * 0.35 }}
          />
          <span className="text-[9px] text-white/60 mt-1 tracking-wide">Loading</span>
        </div>
      ) : (
        <div className="w-full h-full">
          <CommunityNodesSun />
        </div>
      )}
    </div>
  );
}
