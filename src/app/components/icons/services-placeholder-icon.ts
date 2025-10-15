import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'services-placeholder-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#4dd8ff" stroke-width="2" opacity="0.3"/>
      <circle cx="12" cy="12" r="6" stroke="#039be5" stroke-width="2" opacity="0.5"/>
      <circle cx="12" cy="12" r="2" fill="#4dd8ff"/>
    </svg>
  `
})
export class ServicesPlaceholderIcon {}
