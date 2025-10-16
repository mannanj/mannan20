import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { DevStatsIcon } from '../components/icons/dev-stats-icon';
import { toggleDevStatsModal } from '../store/app.actions';

@Component({
  selector: 'dev-stats',
  imports: [DevStatsIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
      (click)="toggleModal()"
      title="Open Dev Stats">
      <dev-stats-icon />
    </div>
  `
})
export class DevStats {
  private store = inject(Store);

  toggleModal() {
    this.store.dispatch(toggleDevStatsModal());
  }
}
