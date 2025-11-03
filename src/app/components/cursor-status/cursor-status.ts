import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppState } from '../../models/models';
import {
  selectPeerConnectionCount,
  selectUseFallbackMode,
  selectConnectingPeers,
  selectFailedPeers,
  selectIsCursorPartyConnected
} from '../../store/cursor.selectors';

@Component({
  selector: 'cursor-status',
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2">
      @if (isConnected()) {
        <div class="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#333]">
          <div [class]="statusIndicatorClass()"></div>
          <span class="text-xs text-white font-medium">{{ statusText() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .status-connecting {
      background: #fbbf24;
    }

    .status-connected {
      background: #10b981;
    }

    .status-fallback {
      background: #f59e0b;
    }

    .status-failed {
      background: #ef4444;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `]
})
export class CursorStatus {
  private store = inject(Store<AppState>);

  private peerConnectionCount = toSignal(this.store.select(selectPeerConnectionCount), { initialValue: 0 });
  private useFallbackMode = toSignal(this.store.select(selectUseFallbackMode), { initialValue: false });
  private connectingPeers = toSignal(this.store.select(selectConnectingPeers), { initialValue: [] });
  private failedPeers = toSignal(this.store.select(selectFailedPeers), { initialValue: [] });
  private isCursorPartyConnected = toSignal(this.store.select(selectIsCursorPartyConnected), { initialValue: false });

  protected isConnected = computed(() => this.isCursorPartyConnected());

  protected statusIndicatorClass = computed(() => {
    const base = 'status-indicator';

    if (this.failedPeers().length > 0) {
      return `${base} status-failed`;
    }

    if (this.useFallbackMode()) {
      return `${base} status-fallback`;
    }

    if (this.connectingPeers().length > 0) {
      return `${base} status-connecting`;
    }

    if (this.peerConnectionCount() > 0) {
      return `${base} status-connected`;
    }

    return `${base} status-connecting`;
  });

  protected statusText = computed(() => {
    const peerCount = this.peerConnectionCount();
    const useFallback = this.useFallbackMode();
    const connectingCount = this.connectingPeers().length;
    const failedCount = this.failedPeers().length;

    if (failedCount > 0) {
      return `Connection issues (${failedCount} failed)`;
    }

    if (useFallback) {
      return `Fallback mode (${peerCount} viewer${peerCount !== 1 ? 's' : ''})`;
    }

    if (connectingCount > 0) {
      return `Connecting to peers...`;
    }

    if (peerCount > 0) {
      return `${peerCount} peer${peerCount !== 1 ? 's' : ''} via P2P`;
    }

    return 'Connecting...';
  });
}
