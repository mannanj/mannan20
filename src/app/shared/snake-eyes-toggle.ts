import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { SnakeIcon } from '../components/icons/snake-icon';
import { toggleSnakeEyes } from '../store/app.actions';
import { selectSnakeEyesEnabled } from '../store/app.selectors';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'snake-eyes-toggle',
  imports: [SnakeIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
      [class.active]="isEnabled()"
      (click)="toggle()"
      title="Toggle Snake Eyes">
      <snake-icon />
    </div>
  `,
  styles: [`
    :host {
      color: #888;
      transition: color 0.2s;
    }

    :host:hover {
      color: #039be5;
    }

    .active {
      color: #039be5 !important;
    }
  `]
})
export class SnakeEyesToggle {
  private store = inject(Store);
  protected isEnabled = toSignal(this.store.select(selectSnakeEyesEnabled), { initialValue: false });

  toggle() {
    this.store.dispatch(toggleSnakeEyes());
  }
}
