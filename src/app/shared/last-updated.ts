import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { selectLastUpdated } from '../store/app.selectors';

@Component({
  selector: 'last-updated',
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  template: `
    @if (lastUpdated$ | async; as lastUpdated) {
      <div class="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg backdrop-blur-md bg-gradient-to-br from-black/60 to-black/40 border border-white/10 shadow-lg">
        <p class="text-white text-xs font-light tracking-wide">
          Last Updated: {{ lastUpdated | date: 'MMM d, y' }}
        </p>
      </div>
    }
  `
})
export class LastUpdated {
  private store = inject(Store);
  protected lastUpdated$ = this.store.select(selectLastUpdated);
}
