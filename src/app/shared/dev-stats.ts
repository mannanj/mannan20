import { Component, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { selectDevCommits } from '../store/app.selectors';

@Component({
  selector: 'dev-stats',
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  template: `
    <button
      class="fixed bottom-1 left-3 z-50 px-3 py-1.5 rounded backdrop-blur-md bg-black/70 opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-gray-400 text-xs"
      (click)="toggleModal()">
      📊
    </button>

    @if (isModalOpen()) {
      <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" (click)="toggleModal()">
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-black">Dev Stats - Recent Commits</h2>
            <button class="text-gray-500 hover:text-black text-2xl" (click)="toggleModal()">×</button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b-2 border-gray-300">
                  <th class="text-left py-2 px-3 text-black">Hash</th>
                  <th class="text-left py-2 px-3 text-black">Subject</th>
                  <th class="text-left py-2 px-3 text-black">Author</th>
                  <th class="text-left py-2 px-3 text-black">Date</th>
                </tr>
              </thead>
              <tbody>
                @for (commit of devCommits$ | async; track commit.hash) {
                  <tr class="border-b border-gray-200 hover:bg-gray-50">
                    <td class="py-2 px-3">
                      <a [href]="commit.url" target="_blank" class="text-blue-600 hover:underline font-mono text-sm">
                        {{ commit.hash }}
                      </a>
                    </td>
                    <td class="py-2 px-3 text-black">{{ commit.subject }}</td>
                    <td class="py-2 px-3 text-gray-600">{{ commit.author }}</td>
                    <td class="py-2 px-3 text-gray-600">{{ commit.date | date: 'MMM d, y h:mm a' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }
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
