import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ModalComponent } from './modal';
import { selectDevCommits } from '../store/app.selectors';

@Component({
  selector: 'dev-stats',
  imports: [AsyncPipe, DatePipe, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block text-white cursor-pointer text-lg hover:scale-150 transition-transform mb-1"
      (click)="toggleModal()"
      title="Open Dev Stats">
      📊
    </span>

    <modal [isOpen]="isModalOpen()" (close)="toggleModal()">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <tbody>
            @for (commit of devCommits$ | async; track commit.hash; let i = $index) {
              @if (i < 5) {
                <tr class="border-b border-gray-700 hover:bg-white/5">
                  <td class="py-1 px-2">
                    <a [href]="commit.url" target="_blank" class="text-[#039be5] hover:underline font-mono text-xs">
                      {{ commit.hash }}
                    </a>
                  </td>
                  <td class="py-1 px-2 text-gray-300 text-xs">{{ commit.subject }}</td>
                  <td class="py-1 px-2 text-gray-400 text-xs">{{ commit.author }}</td>
                  <td class="py-1 px-2 text-gray-400 text-xs">{{ commit.date | date: 'MMM d, y h:mm a' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </modal>
  `
})
export class DevStats {
  private store = inject(Store);

  protected isModalOpen = signal(false);
  protected devCommits$ = this.store.select(selectDevCommits);

  toggleModal() {
    this.isModalOpen.update(value => !value);
  }
}
