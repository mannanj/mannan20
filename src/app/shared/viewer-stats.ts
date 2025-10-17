import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectActiveViewerCount, selectIsCursorPartyConnected } from '../store/cursor.selectors';
import { toggleCommandsModal } from '../store/app.actions';

@Component({
  selector: 'viewer-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fadeIn {
      from {
        filter: blur(2px);
        opacity: 0.6;
      }
      to {
        filter: blur(0px);
        opacity: 0.8;
      }
    }

    .stats-container {
      animation: fadeIn 1000ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `],
  template: `
      <div class="stats-container fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
           (click)="openCommands()">
        <div class="flex items-center gap-2.5 text-white text-xs font-light">
          <span class="text-[#039be5]">{{ viewerCount() }} viewing</span>
          <span class="text-gray-400">•</span>
          <span class="text-gray-300">Open Commands <kbd class="px-1 py-0.5 bg-white/10 rounded text-[10px]">H</kbd></span>
        </div>
      </div>
  `
})
export class ViewerStats {
  private store = inject(Store);
  protected viewerCount = this.store.selectSignal(selectActiveViewerCount);
  protected isConnected = this.store.selectSignal(selectIsCursorPartyConnected);

  openCommands() {
    this.store.dispatch(toggleCommandsModal());
  }
}
