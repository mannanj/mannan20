import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'dev-stats-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 8 4 8 8C8 10 9 11 9 12C9 13 8 14 8 16C8 20 12 22 12 22C12 22 16 20 16 16C16 14 15 13 15 12C15 11 16 10 16 8C16 4 12 2 12 2Z"
            fill="url(#wave1)" opacity="0.6"/>
      <path d="M12 5C12 5 10 6 10 9C10 10.5 11 11 11 12C11 13 10 13.5 10 15C10 18 12 19 12 19C12 19 14 18 14 15C14 13.5 13 13 13 12C13 11 14 10.5 14 9C14 6 12 5 12 5Z"
            fill="url(#wave2)" opacity="0.8"/>
      <circle cx="12" cy="8" r="1" fill="#4dd8ff"/>
      <circle cx="12" cy="12" r="1.5" fill="#039be5"/>
      <circle cx="12" cy="16" r="1" fill="#4dd8ff"/>
      <text x="18" y="8" fill="#4dd8ff" font-size="6" font-weight="bold">1</text>
      <text x="18" y="14" fill="#039be5" font-size="6" font-weight="bold">0</text>
      <defs>
        <linearGradient id="wave1" x1="12" y1="2" x2="12" y2="22">
          <stop offset="0%" stop-color="#4dd8ff"/>
          <stop offset="100%" stop-color="#039be5"/>
        </linearGradient>
        <linearGradient id="wave2" x1="12" y1="5" x2="12" y2="19">
          <stop offset="0%" stop-color="#039be5"/>
          <stop offset="100%" stop-color="#0277bd"/>
        </linearGradient>
      </defs>
    </svg>
  `
})
export class DevStatsIcon {}
