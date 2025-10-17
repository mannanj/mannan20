import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { selectLastUpdated } from '../store/app.selectors';

@Component({
  selector: 'last-updated',
  imports: [AsyncPipe, DatePipe],
  template: `
    @if (lastUpdated$ | async; as lastUpdated) {
      <div class="px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-30">
        <div class="text-gray-400 text-xs font-light italic" [title]="lastUpdated | date: 'MMM d, y h:mm:ss a'">
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
