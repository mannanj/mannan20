import { Component, computed, signal, effect, input, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

@Component({
  selector: 'app-daylight-bar',
  imports: [CommonModule],
  template: `
    <div class="relative h-6 rounded-full overflow-hidden bg-gradient-to-r from-[#1a1a2e] via-[#3d3d5c] to-[#1a1a2e]">
      <div
        class="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 transition-all duration-1000 ease-out rounded-full"
        [style.width.%]="daylightPercentage()"
        [style.box-shadow]="'0 0 10px rgba(251, 191, 36, 0.5)'"
      ></div>
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="text-xs font-medium text-white mix-blend-difference">
          {{ formattedTime() }}
        </span>
      </div>
    </div>
  `,
  styles: []
})
export class DaylightBarComponent {
  latitude = input<number>(37.7749);
  longitude = input<number>(-122.4194);

  private platformId = inject(PLATFORM_ID);
  private currentTime = signal(new Date());
  private sunTimes = computed(() => this.calculateSunTimes());

  daylightPercentage = computed(() => {
    const times = this.sunTimes();
    const now = this.currentTime();

    if (now < times.sunrise) {
      return 0;
    }

    if (now > times.sunset) {
      return 100;
    }

    const totalDaylight = times.sunset.getTime() - times.sunrise.getTime();
    const elapsedDaylight = now.getTime() - times.sunrise.getTime();

    return Math.round((elapsedDaylight / totalDaylight) * 100);
  });

  formattedTime = computed(() => {
    const percentage = this.daylightPercentage();
    const times = this.sunTimes();
    const now = this.currentTime();

    if (now < times.sunrise) {
      const minutesUntilSunrise = Math.floor((times.sunrise.getTime() - now.getTime()) / 60000);
      return `${this.formatTime(times.sunrise)} Sunrise`;
    }

    if (now > times.sunset) {
      return 'Night';
    }

    const totalMinutes = Math.floor((times.sunset.getTime() - times.sunrise.getTime()) / 60000);
    const elapsedMinutes = Math.floor((now.getTime() - times.sunrise.getTime()) / 60000);
    const remainingMinutes = totalMinutes - elapsedMinutes;

    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    if (hours > 0) {
      return `${hours}.${Math.floor(minutes / 6)}h`;
    }
    return `${minutes}m`;
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const interval = setInterval(() => {
          this.currentTime.set(new Date());
        }, 60000);

        return () => clearInterval(interval);
      }
      return;
    }, { allowSignalWrites: true });
  }

  private calculateSunTimes(): SunTimes {
    const lat = this.latitude();
    const lng = this.longitude();
    const now = new Date();

    const J = this.getJulianDay(now);
    const n = J - 2451545.0 + 0.0008;

    const M = (357.5291 + 0.98560028 * n) % 360;
    const C = 1.9148 * Math.sin(M * Math.PI / 180) +
              0.0200 * Math.sin(2 * M * Math.PI / 180) +
              0.0003 * Math.sin(3 * M * Math.PI / 180);

    const lambda = (M + C + 180 + 102.9372) % 360;

    const Jtransit = 2451545.0 + n + 0.0053 * Math.sin(M * Math.PI / 180) -
                     0.0069 * Math.sin(2 * lambda * Math.PI / 180);

    const delta = Math.asin(Math.sin(lambda * Math.PI / 180) *
                           Math.sin(23.44 * Math.PI / 180)) * 180 / Math.PI;

    const omega = Math.acos((Math.sin(-0.83 * Math.PI / 180) -
                            Math.sin(lat * Math.PI / 180) * Math.sin(delta * Math.PI / 180)) /
                            (Math.cos(lat * Math.PI / 180) * Math.cos(delta * Math.PI / 180)));

    const omegaDeg = omega * 180 / Math.PI;

    const Jset = Jtransit + omegaDeg / 360;
    const Jrise = Jtransit - omegaDeg / 360;

    const sunrise = this.julianToDate(Jrise);
    const sunset = this.julianToDate(Jset);

    return { sunrise, sunset };
  }

  private getJulianDay(date: Date): number {
    return date.getTime() / 86400000 + 2440587.5;
  }

  private julianToDate(julian: number): Date {
    return new Date((julian - 2440587.5) * 86400000);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}
