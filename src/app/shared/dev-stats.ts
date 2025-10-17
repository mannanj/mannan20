import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { DevStatsIcon } from '../components/icons/dev-stats-icon';
import { toggleDevStatsModal } from '../store/app.actions';
import { selectDevCommits } from '../store/app.selectors';

@Component({
  selector: 'dev-stats',
  imports: [DevStatsIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasDevCommits()) {
      <div
        class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
        (click)="toggleModal()"
        title="Open Dev Stats">
        <dev-stats-icon />
      </div>
    }
  `
})
export class DevStats {
  private store = inject(Store);
  private devCommits = this.store.selectSignal(selectDevCommits);
  protected hasDevCommits = computed(() => this.devCommits().length > 0);

  toggleModal() {
    this.store.dispatch(toggleDevStatsModal());
  }
}
