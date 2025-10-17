import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 overflow-hidden relative">
      <div class="relative">
        <div class="flex items-center gap-2.5 text-white text-xs font-light blur-[1px] opacity-80">
          <span class="flex items-center gap-1">
            <span class="inline-block w-3 h-3">0</span>
            <span class="text-[#039be5]">viewing</span>
          </span>
          <span class="text-gray-400">•</span>
          <span class="inline-block">Open Commands H</span>
        </div>

        <div
          class="absolute inset-0 pointer-events-none peripheral-vision"
          [style.background]="visionGradient()">
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes vision-shift {
      0% {
        background-position: 0% 50%;
      }
      25% {
        background-position: 100% 50%;
      }
      50% {
        background-position: 50% 100%;
      }
      75% {
        background-position: 0% 0%;
      }
      100% {
        background-position: 0% 50%;
      }
    }

    .peripheral-vision {
      opacity: 0.5;
      animation: vision-shift 8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
      background-size: 200% 200%;
      mix-blend-mode: screen;
    }
  `]
})
export class ViewerStatsLoading implements OnInit {
  visionGradient = signal<string>('');

  ngOnInit() {
    const colors = [
      { name: 'red', center: 'rgba(239, 68, 68, 0.5)', edge: 'rgba(128, 128, 128, 0.5)' },
      { name: 'green', center: 'rgba(34, 197, 94, 0.5)', edge: 'rgba(128, 128, 128, 0.5)' },
      { name: 'blue', center: 'rgba(59, 130, 246, 0.5)', edge: 'rgba(128, 128, 128, 0.5)' }
    ];

    const selectedColor = colors[Math.floor(Math.random() * colors.length)];
    const gradient = `radial-gradient(circle at center, ${selectedColor.center} 0%, ${selectedColor.center} 20%, ${selectedColor.edge} 70%, ${selectedColor.edge} 100%)`;

    this.visionGradient.set(gradient);
  }
}
