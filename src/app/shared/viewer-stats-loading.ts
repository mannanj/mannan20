import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes shimmer-color {
      0% {
        filter: hue-rotate(0deg) brightness(0.8);
      }
      18% {
        filter: hue-rotate(45deg) brightness(1.1);
      }
      32% {
        filter: hue-rotate(120deg) brightness(0.9);
      }
      48% {
        filter: hue-rotate(180deg) brightness(1.2);
      }
      61% {
        filter: hue-rotate(240deg) brightness(0.85);
      }
      79% {
        filter: hue-rotate(320deg) brightness(1.05);
      }
      100% {
        filter: hue-rotate(360deg) brightness(0.8);
      }
    }

    @keyframes shimmer-slow {
      0% {
        background-position: -200px 0;
        opacity: 0.3;
      }
      20% {
        opacity: 0.5;
      }
      35% {
        background-position: -50px 0;
        opacity: 0.4;
      }
      45% {
        background-position: -30px 0;
        opacity: 0.35;
      }
      65% {
        background-position: 100px 0;
        opacity: 0.6;
      }
      80% {
        opacity: 0.45;
      }
      100% {
        background-position: 200px 0;
        opacity: 0.3;
      }
    }

    @keyframes shimmer-burst {
      0% {
        background-position: -200px 0;
        opacity: 0.4;
      }
      15% {
        opacity: 0.7;
      }
      40% {
        background-position: 150px 0;
        opacity: 0.8;
      }
      60% {
        background-position: 200px 0;
        opacity: 0.5;
      }
      100% {
        background-position: 220px 0;
        opacity: 0.4;
      }
    }

    @keyframes shimmer-rest {
      0% {
        background-position: -200px 0;
        opacity: 0.25;
      }
      30% {
        opacity: 0.3;
      }
      50% {
        background-position: -100px 0;
        opacity: 0.28;
      }
      75% {
        opacity: 0.32;
      }
      100% {
        background-position: 50px 0;
        opacity: 0.25;
      }
    }

    .shimmer {
      background: linear-gradient(90deg,
        rgba(255, 0, 0, 0.15) 0%,
        rgba(0, 255, 0, 0.2) 25%,
        rgba(0, 100, 255, 0.25) 50%,
        rgba(0, 255, 100, 0.2) 75%,
        rgba(255, 50, 0, 0.15) 100%);
      background-size: 200px 100%;
      animation:
        shimmer-slow 4.2s cubic-bezier(0.4, 0.1, 0.6, 0.9) infinite,
        shimmer-burst 2.7s cubic-bezier(0.2, 0.8, 0.3, 1) 1.5s infinite,
        shimmer-rest 6.5s cubic-bezier(0.5, 0, 0.5, 1) 0.8s infinite,
        shimmer-color 5.8s cubic-bezier(0.45, 0.15, 0.55, 0.85) 0.3s infinite;
    }

    .shimmer-alt {
      background: linear-gradient(90deg,
        rgba(0, 100, 255, 0.15) 0%,
        rgba(255, 0, 100, 0.2) 25%,
        rgba(0, 255, 50, 0.25) 50%,
        rgba(255, 100, 0, 0.2) 75%,
        rgba(0, 150, 255, 0.15) 100%);
      background-size: 200px 100%;
      animation:
        shimmer-slow 5.1s cubic-bezier(0.3, 0.2, 0.7, 0.8) 0.5s infinite,
        shimmer-burst 3.3s cubic-bezier(0.25, 0.75, 0.35, 0.95) 2.1s infinite,
        shimmer-rest 7.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,
        shimmer-color 6.7s cubic-bezier(0.35, 0.25, 0.65, 0.75) 1.2s infinite;
    }
  `],
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80">
      <div class="flex items-center gap-2.5 text-white text-xs font-light">
        <span class="flex items-center gap-1">
          <span class="shimmer inline-block w-3 h-3 rounded bg-gray-700"></span>
          <span class="text-[#039be5]">viewing</span>
        </span>
        <span class="text-gray-400">•</span>
        <span class="shimmer-alt inline-block w-32 h-3 rounded bg-gray-700"></span>
      </div>
    </div>
  `
})
export class ViewerStatsLoading {}
