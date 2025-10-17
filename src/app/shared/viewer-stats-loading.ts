import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'viewer-stats-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes vision-pulse {
      0% {
        background-position: 50% 50%;
        opacity: 0.6;
      }
      25% {
        background-position: 30% 70%;
        opacity: 0.8;
      }
      50% {
        background-position: 70% 30%;
        opacity: 0.7;
      }
      75% {
        background-position: 40% 60%;
        opacity: 0.9;
      }
      100% {
        background-position: 50% 50%;
        opacity: 0.6;
      }
    }

    @keyframes vision-scan {
      0% {
        background-position: 20% 50%;
        opacity: 0.5;
      }
      30% {
        background-position: 80% 30%;
        opacity: 0.85;
      }
      60% {
        background-position: 50% 80%;
        opacity: 0.7;
      }
      100% {
        background-position: 20% 50%;
        opacity: 0.5;
      }
    }

    .vision-effect {
      background-size: 200% 200%;
      animation:
        vision-pulse 3.5s cubic-bezier(0.4, 0.1, 0.6, 0.9) infinite,
        vision-scan 5.2s cubic-bezier(0.3, 0.2, 0.7, 0.8) 0.5s infinite;
    }

    .vision-effect-alt {
      background-size: 200% 200%;
      animation:
        vision-pulse 4.1s cubic-bezier(0.45, 0.05, 0.55, 0.95) 0.8s infinite,
        vision-scan 6.3s cubic-bezier(0.35, 0.15, 0.65, 0.85) 1.2s infinite;
    }
  `],
  template: `
    <div class="fixed bottom-1 left-2 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-80">
      <div class="flex items-center gap-2.5 text-white text-xs font-light">
        <span class="flex items-center gap-1">
          <span
            class="vision-effect inline-block w-3 h-3 rounded bg-gray-700"
            [style.background]="visionGradient()"></span>
          <span class="text-[#039be5]">viewing</span>
        </span>
        <span class="text-gray-400">•</span>
        <span
          class="vision-effect-alt inline-block w-32 h-3 rounded bg-gray-700"
          [style.background]="visionGradientAlt()"></span>
      </div>
    </div>
  `
})
export class ViewerStatsLoading implements OnInit {
  visionGradient = signal<string>('');
  visionGradientAlt = signal<string>('');

  ngOnInit() {
    const colors = [
      { center: 'rgba(239, 68, 68, 0.8)', edge: 'rgba(128, 128, 128, 0.5)' },
      { center: 'rgba(34, 197, 94, 0.8)', edge: 'rgba(128, 128, 128, 0.5)' },
      { center: 'rgba(59, 130, 246, 0.8)', edge: 'rgba(128, 128, 128, 0.5)' }
    ];

    const selectedColor = colors[Math.floor(Math.random() * colors.length)];

    const gradient1 = `radial-gradient(circle, ${selectedColor.center} 0%, ${selectedColor.center} 15%, ${selectedColor.edge} 60%, ${selectedColor.edge} 100%), linear-gradient(90deg, rgba(100, 100, 100, 0.3), rgba(150, 150, 150, 0.4))`;
    const gradient2 = `radial-gradient(circle, ${selectedColor.center} 0%, ${selectedColor.center} 10%, ${selectedColor.edge} 55%, ${selectedColor.edge} 100%), linear-gradient(90deg, rgba(100, 100, 100, 0.3), rgba(150, 150, 150, 0.4))`;

    this.visionGradient.set(gradient1);
    this.visionGradientAlt.set(gradient2);
  }
}
