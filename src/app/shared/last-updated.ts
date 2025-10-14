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
      <div class="fixed bottom-1 right-2 z-50 px-1.5 py-0.5 rounded backdrop-blur-md bg-black/60">
        <p class="text-white text-[10px] font-light italic">
          Last Updated {{ lastUpdated | date: 'MMM d, y' }}
        </p>
      </div>
    }
  `
})
export class LastUpdated {
  private store = inject(Store);
  protected lastUpdated$ = this.store.select(selectLastUpdated);
}
