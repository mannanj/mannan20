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
  dotRadius: number;
  onDone: () => void;
}

const SHOW_DURATION_MS = 10000;
const GROW_MS = 1100;
const FADE_MS = 800;

export function CommunityNodesSunTrigger({ x, y, size, dotRadius, onDone }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [grown, setGrown] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const initialScale = Math.max(0.02, (dotRadius * 2) / size);

  useEffect(() => {
    let cancelLoad = false;
    import("./community-nodes-sun").then(() => {
      if (!cancelLoad) setLoaded(true);
    });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelLoad = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const startFade = window.setTimeout(() => setFadingOut(true), SHOW_DURATION_MS - FADE_MS);
    const done = window.setTimeout(onDone, SHOW_DURATION_MS);
    return () => {
      window.clearTimeout(startFade);
      window.clearTimeout(done);
    };
  }, [onDone]);

  const scale = fadingOut ? initialScale : grown ? 1 : initialScale;
  const opacity = fadingOut ? 0 : grown ? 1 : 0.5;

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    pointerEvents: "none",
    transformOrigin: "center",
    transform: `scale(${scale})`,
    opacity,
    transition: fadingOut
      ? `transform ${FADE_MS}ms cubic-bezier(0.5, 0, 0.75, 0), opacity ${FADE_MS}ms ease-in`
      : `transform ${GROW_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${GROW_MS}ms ease-out`,
    willChange: "transform, opacity",
    borderRadius: "50%",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(14px) saturate(1.4)",
    WebkitBackdropFilter: "blur(14px) saturate(1.4)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    boxShadow: [
      "0 12px 40px rgba(0, 0, 0, 0.35)",
      "0 2px 8px rgba(0, 0, 0, 0.25)",
      "inset 0 1px 1px rgba(255, 255, 255, 0.35)",
      "inset 0 -1px 2px rgba(255, 255, 255, 0.08)",
      "inset 0 0 16px rgba(255, 255, 255, 0.04)",
    ].join(", "),
  };

  return (
    <div style={wrapperStyle}>
      {loaded ? (
        <div className="w-full h-full">
          <CommunityNodesSun />
        </div>
      ) : (
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,248,220,1) 0%, rgba(255,190,90,0.95) 40%, rgba(255,110,40,0.55) 70%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}
    </div>
  );
}
