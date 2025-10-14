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
      <div class="fixed bottom-1 right-0 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-30">
        <div class="text-gray-400 text-xs font-light italic">
          Last Updated {{ lastUpdated | date: 'MMM d, y' }}
        </div>
      </div>
    }
  `
})
export class LastUpdated {
  private store = inject(Store);
  protected lastUpdated$ = this.store.select(selectLastUpdated);
}
