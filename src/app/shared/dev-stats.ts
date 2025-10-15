import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Modal } from './modal';
import { TasksContainer } from './tasks-container';
import { selectDevCommits, selectTasks } from '../store/app.selectors';
import { DevStatsIcon } from '../components/icons/dev-stats-icon';
import { ServicesPlaceholderIcon } from '../components/icons/services-placeholder-icon';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'dev-stats',
  imports: [AsyncPipe, DatePipe, Modal, TasksContainer, DevStatsIcon, ServicesPlaceholderIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
      (click)="toggleModal()"
      title="Open Dev Stats">
      <dev-stats-icon />
    </div>

    <modal [isOpen]="isModalOpen()" (close)="toggleModal()">
      <div class="tabs-container">
        <div class="flex gap-2 border-b border-[#333] mb-4">
          <button
            [class]="activeTab() === 'commits' ? 'bg-transparent border-0 text-[#039be5] py-2 px-4 cursor-pointer text-sm border-b-2 border-[#039be5] transition-all duration-200 relative top-px' : 'bg-transparent border-0 text-[#888] py-2 px-4 cursor-pointer text-sm border-b-2 border-transparent transition-all duration-200 relative top-px hover:text-[#4dd8ff]'"
            (click)="setActiveTab('commits')">
            Git Commits
          </button>
          <button
            [class]="activeTab() === 'services' ? 'bg-transparent border-0 text-[#039be5] py-2 px-4 cursor-pointer text-sm border-b-2 border-[#039be5] transition-all duration-200 relative top-px' : 'bg-transparent border-0 text-[#888] py-2 px-4 cursor-pointer text-sm border-b-2 border-transparent transition-all duration-200 relative top-px hover:text-[#4dd8ff]'"
            (click)="setActiveTab('services')">
            Services Status
          </button>
          <button
            [class]="activeTab() === 'tasks' ? 'bg-transparent border-0 text-[#039be5] py-2 px-4 cursor-pointer text-sm border-b-2 border-[#039be5] transition-all duration-200 relative top-px' : 'bg-transparent border-0 text-[#888] py-2 px-4 cursor-pointer text-sm border-b-2 border-transparent transition-all duration-200 relative top-px hover:text-[#4dd8ff]'"
            (click)="setActiveTab('tasks')">
            Tasks
          </button>
        </div>

        <div class="tab-content">
          @if (activeTab() === 'commits') {
            <div class="max-h-[400px] overflow-y-auto overflow-x-auto">
              <table class="w-full border-collapse">
                <tbody>
                  @for (commit of filteredCommits(); track commit.hash) {
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
                </tbody>
              </table>
            </div>
          }

          @if (activeTab() === 'services') {
            <div class="services-placeholder">
              <div class="text-center text-gray-400 py-8">
                <services-placeholder-icon class="mx-auto mb-4" />
                <p class="text-sm">Services Status</p>
                <p class="text-xs text-gray-500 mt-2">Coming soon...</p>
              </div>
            </div>
          }

          @if (activeTab() === 'tasks') {
            @if (tasks$ | async; as tasks) {
              <tasks-container [tasks]="tasks" />
            }
          }
        </div>
      </div>
    </modal>
  `,
  styles: [`
    .tabs-container {
      min-height: 300px;
    }

    .tab-content {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class DevStats {
  private store = inject(Store);

  protected isModalOpen = signal(false);
  protected activeTab = signal<'commits' | 'services' | 'tasks'>('commits');
  protected tasks$ = this.store.select(selectTasks);

  private allCommits = toSignal(this.store.select(selectDevCommits), { initialValue: [] });
  protected filteredCommits = computed(() =>
    this.allCommits().filter(commit => commit.subject !== 'Update dev data files')
  );

  toggleModal() {
    this.isModalOpen.update(value => !value);
  }

  setActiveTab(tab: 'commits' | 'services' | 'tasks') {
    this.activeTab.set(tab);
  }
}
