import type { Metadata } from "next";
import { GardenExplorer } from "@/components/garden/garden-explorer";

export const metadata: Metadata = {
  title: "Garden",
  description: "Learn about me and my quirks and grooves.",
};

function PlantOne() {
  return (
    <svg
      viewBox="0 0 60 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-12 h-24"
    >
      <path d="M30 110V50" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M30 70C20 60 12 45 18 35C24 25 30 40 30 50"
        stroke="#4a7c3f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 55C40 45 48 30 42 20C36 10 30 25 30 35"
        stroke="#2d5a27"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function PlantTwo() {
  return (
    <svg
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-16 h-20"
    >
      <path d="M40 90V45" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M40 60C30 55 15 50 20 38C25 26 35 42 40 50"
        stroke="#4a7c3f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 50C50 45 65 40 60 28C55 16 45 32 40 40"
        stroke="#4a7c3f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 45C35 35 30 18 38 12C46 6 42 25 40 35"
        stroke="#2d5a27"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function PlantThree() {
  return (
    <svg
      viewBox="0 0 50 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-16"
    >
      <path d="M25 75V40" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M25 50C18 42 10 28 18 22C26 16 25 35 25 42"
        stroke="#4a7c3f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M25 42C32 34 40 20 32 14C24 8 25 27 25 34"
        stroke="#2d5a27"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function GardenPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0b0b0b] text-white">
      <div className="pointer-events-none absolute top-24 right-8 opacity-[0.10]">
        <PlantOne />
      </div>
      <div className="pointer-events-none absolute top-[55%] left-6 opacity-[0.08]">
        <PlantTwo />
      </div>
      <div className="pointer-events-none absolute bottom-24 right-12 opacity-[0.10]">
        <PlantThree />
      </div>

      <GardenExplorer />
    </div>
  );
}
