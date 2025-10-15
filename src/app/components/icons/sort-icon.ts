import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'sort-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 5h10M11 9h7M11 13h4"/>
      @if (direction() === 'asc') {
        <path d="M4 16l4 4 4-4M8 20V4"/>
      } @else {
        <path d="M4 8l4-4 4 4M8 4v16"/>
      }
    </svg>
  `
})
export class SortIcon {
  direction = input<'asc' | 'desc'>('desc');
}
