import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80">
      <div class="flex items-center gap-2.5 text-white text-xs font-light">
        <span class="flex items-center gap-1">
          <span class="shimmer inline-block w-3 h-3 rounded bg-gray-700"></span>
          <span class="text-[#039be5]">viewing</span>
        </span>
        <span class="text-gray-400">•</span>
        <span class="shimmer inline-block w-32 h-3 rounded bg-gray-700"></span>
      </div>
    </div>
  `
})
export class ViewerStatsLoading {}
