import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes loading-pulse {
      0% {
        opacity: 0.65;
        filter: blur(1.5px);
      }
      50% {
        opacity: 0.9;
        filter: blur(0.8px);
      }
      100% {
        opacity: 0.65;
        filter: blur(1.5px);
      }
    }

    .loading-content {
      animation: loading-pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `],
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70">
      <div class="loading-content flex items-center gap-2.5 text-white text-xs font-light">
        <span class="flex items-center gap-1">
          <span>1</span>
          <span class="text-[#039be5]">viewing</span>
        </span>
        <span class="text-gray-400">•</span>
        <span>Open Commands H</span>
      </div>
    </div>
  `
})
export class ViewerStatsLoading {}
