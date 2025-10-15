import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ModalComponent } from './modal';
import { TaskCard } from './task-card';
import { TaskTable } from './task-table';
import { TasksToolbar } from './tasks-toolbar';
import { selectDevCommits, selectTasks } from '../store/app.selectors';

@Component({
  selector: 'dev-stats',
  imports: [AsyncPipe, DatePipe, ModalComponent, TaskCard, TaskTable, TasksToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
      (click)="toggleModal()"
      title="Open Dev Stats">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C12 2 8 4 8 8C8 10 9 11 9 12C9 13 8 14 8 16C8 20 12 22 12 22C12 22 16 20 16 16C16 14 15 13 15 12C15 11 16 10 16 8C16 4 12 2 12 2Z"
              fill="url(#wave1)" opacity="0.6"/>
        <path d="M12 5C12 5 10 6 10 9C10 10.5 11 11 11 12C11 13 10 13.5 10 15C10 18 12 19 12 19C12 19 14 18 14 15C14 13.5 13 13 13 12C13 11 14 10.5 14 9C14 6 12 5 12 5Z"
              fill="url(#wave2)" opacity="0.8"/>
        <circle cx="12" cy="8" r="1" fill="#4dd8ff"/>
        <circle cx="12" cy="12" r="1.5" fill="#039be5"/>
        <circle cx="12" cy="16" r="1" fill="#4dd8ff"/>
        <text x="18" y="8" fill="#4dd8ff" font-size="6" font-weight="bold">1</text>
        <text x="18" y="14" fill="#039be5" font-size="6" font-weight="bold">0</text>
        <defs>
          <linearGradient id="wave1" x1="12" y1="2" x2="12" y2="22">
            <stop offset="0%" stop-color="#4dd8ff"/>
            <stop offset="100%" stop-color="#039be5"/>
          </linearGradient>
          <linearGradient id="wave2" x1="12" y1="5" x2="12" y2="19">
            <stop offset="0%" stop-color="#039be5"/>
            <stop offset="100%" stop-color="#0277bd"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <modal [isOpen]="isModalOpen()" (close)="toggleModal()">
      <div class="tabs-container">
        <div class="tabs-header">
          <button
            [class.active]="activeTab() === 'commits'"
            (click)="setActiveTab('commits')"
            class="tab-button">
            Git Commits
          </button>
          <button
            [class.active]="activeTab() === 'services'"
            (click)="setActiveTab('services')"
            class="tab-button">
            Services Status
          </button>
          <button
            [class.active]="activeTab() === 'tasks'"
            (click)="setActiveTab('tasks')"
            class="tab-button">
            Tasks
          </button>
        </div>

        <div class="tab-content">
          @if (activeTab() === 'commits') {
            <div class="commits-table-container">
              <table class="w-full border-collapse">
                <tbody>
                  @for (commit of devCommits$ | async; track commit.hash) {
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
                <svg class="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#4dd8ff" stroke-width="2" opacity="0.3"/>
                  <circle cx="12" cy="12" r="6" stroke="#039be5" stroke-width="2" opacity="0.5"/>
                  <circle cx="12" cy="12" r="2" fill="#4dd8ff"/>
                </svg>
                <p class="text-sm">Services Status</p>
                <p class="text-xs text-gray-500 mt-2">Coming soon...</p>
              </div>
            </div>
          }

          @if (activeTab() === 'tasks') {
            <div class="tasks-view">
              <tasks-toolbar
                [currentView]="taskView()"
                [sortOrder]="sortOrder()"
                (viewChange)="setTaskView($event)"
                (sortToggle)="toggleSortOrder()" />

              @if (taskView() === 'card') {
                <div class="tasks-container">
                  @for (task of sortedTasks(); track task.id) {
                    <task-card [task]="task" />
                  }
                </div>
              } @else {
                <task-table [tasks]="sortedTasks()" />
              }
            </div>
          }
        </div>
      </div>
    </modal>
  `,
  styles: [`
    .tabs-container {
      min-height: 300px;
    }

    .tabs-header {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #333;
      margin-bottom: 16px;
    }

    .tab-button {
      background: none;
      border: none;
      color: #888;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      position: relative;
      top: 1px;
    }

    .tab-button:hover {
      color: #4dd8ff;
    }

    .tab-button.active {
      color: #039be5;
      border-bottom-color: #039be5;
    }

    .tab-content {
      animation: fadeIn 0.3s ease-in;
    }

    .commits-table-container {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: auto;
    }

    .tasks-view {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .tasks-container {
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
  protected taskView = signal<'card' | 'table'>('card');
  protected sortOrder = signal<'asc' | 'desc'>('desc');
  protected devCommits$ = this.store.select(selectDevCommits);
  protected tasks$ = this.store.select(selectTasks);
  protected tasksSignal = toSignal(this.tasks$, { initialValue: [] });

  protected sortedTasks = computed(() => {
    const tasks = this.tasksSignal();
    if (!tasks || tasks.length === 0) return [];

    const sorted = [...tasks].sort((a, b) => {
      const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
      const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;

      if (dateA === 0 && dateB === 0) return 0;
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;

      return this.sortOrder() === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  });

  toggleModal() {
    this.isModalOpen.update(value => !value);
  }

  setActiveTab(tab: 'commits' | 'services' | 'tasks') {
    this.activeTab.set(tab);
  }

  setTaskView(view: 'card' | 'table') {
    this.taskView.set(view);
  }

  toggleSortOrder() {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
  }
}
