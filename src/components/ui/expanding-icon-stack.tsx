"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface IconStackContextValue {
  expanded: boolean;
  clicksAllowed: boolean;
  toggle: () => void;
  reveal: () => void;
  collapse: () => void;
  gatedClick: (e: React.MouseEvent<HTMLElement>) => boolean;
}

const IconStackContext = createContext<IconStackContextValue | null>(null);

export function useIconStack(): IconStackContextValue {
  const ctx = useContext(IconStackContext);
  if (!ctx) {
    throw new Error("useIconStack must be used within an <ExpandingIconStack>");
  }
  return ctx;
}

interface ExpandingIconStackProps {
  children: ReactNode | ((stack: IconStackContextValue) => ReactNode);
  className?: string;
  gateMs?: number;
  "data-testid"?: string;
}

export function ExpandingIconStack({
  children,
  className,
  gateMs = 1000,
  "data-testid": dataTestId,
}: ExpandingIconStackProps) {
  const [expanded, setExpanded] = useState(false);
  const [clicksAllowed, setClicksAllowed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (expanded) {
      setClicksAllowed(false);
      gateTimerRef.current = setTimeout(() => setClicksAllowed(true), gateMs);
    } else {
      setClicksAllowed(false);
      if (gateTimerRef.current) clearTimeout(gateTimerRef.current);
    }
    return () => {
      if (gateTimerRef.current) clearTimeout(gateTimerRef.current);
    };
  }, [expanded, gateMs]);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [expanded]);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);
  const reveal = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);

  const gatedClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!clicksAllowed) {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(true);
        return false;
      }
      return true;
    },
    [clicksAllowed],
  );

  const value: IconStackContextValue = {
    expanded,
    clicksAllowed,
    toggle,
    reveal,
    collapse,
    gatedClick,
  };

  return (
    <IconStackContext.Provider value={value}>
      <div
        ref={containerRef}
        data-testid={dataTestId}
        className={className}
        onMouseEnter={reveal}
        onMouseLeave={collapse}
      >
        {typeof children === "function" ? children(value) : children}
      </div>
    </IconStackContext.Provider>
  );
}

interface StackItemProps {
  children: ReactNode;
  collapsed: string;
  expanded: string;
  z: number;
  className?: string;
}

export function StackItem({
  children,
  collapsed,
  expanded: expandedClass,
  z,
  className,
}: StackItemProps) {
  const { expanded } = useIconStack();
  return (
    <div
      style={{ zIndex: z }}
      className={`absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out ${
        expanded ? expandedClass : collapsed
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
