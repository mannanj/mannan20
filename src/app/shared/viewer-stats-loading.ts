import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes initial-blur {
      0% {
        filter: blur(5px);
      }
      100% {
        filter: blur(0px);
      }
    }

    @keyframes heartbeat-pulse {
      0%, 100% {
        filter: blur(0.5px);
        opacity: 0.75;
      }
      50% {
        filter: blur(1px);
        opacity: 0.85;
      }
    }

    .loading-content {
      animation:
        initial-blur 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards,
        heartbeat-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) 500ms infinite;
    }
  `],
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80">
      <div class="loading-content flex items-center gap-2.5 text-white text-xs font-light">
        <span class="text-[#039be5]">1 viewing</span>
        <span class="text-gray-400">•</span>
        <span class="text-gray-300">Open Commands H</span>
      </div>
    </div>
  `
})
export class ViewerStatsLoading {}
