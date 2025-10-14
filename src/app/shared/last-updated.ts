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
      <div class="fixed bottom-0 right-2 z-50 px-2 py-1 rounded backdrop-blur-md bg-black/60">
        <p class="text-white text-[10px] font-light italic">
          Last Update {{ lastUpdated | date: 'MMM d, y' }}
        </p>
      </div>
    }
  `
})
export class LastUpdated {
  private store = inject(Store);
  protected lastUpdated$ = this.store.select(selectLastUpdated);
}
