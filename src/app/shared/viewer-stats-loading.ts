import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .entering {
      filter: blur(5px);
      transition: filter 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .leaving {
      filter: blur(0px);
      transition: filter 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `],
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80 flex items-center gap-2.5 text-white text-xs font-light" animate.enter="entering" animate.leave="leaving">
      <span class="text-[#039be5]">1 viewing</span>
      <span class="text-gray-400">•</span>
      <span class="text-gray-300">Open Commands H</span>
    </div>
  `
})
export class ViewerStatsLoading {}
