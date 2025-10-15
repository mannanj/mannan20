import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'card-view-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  `
})
export class CardViewIcon {}
