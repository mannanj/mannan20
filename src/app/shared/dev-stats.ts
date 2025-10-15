import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { Modal } from './modal';
import { TasksContainer } from './tasks-container';
import { CommitsGrid } from './commits-grid';
import { selectDevCommits, selectTasks } from '../store/app.selectors';
import { DevStatsIcon } from '../components/icons/dev-stats-icon';
import { ServicesPlaceholderIcon } from '../components/icons/services-placeholder-icon';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'dev-stats',
  imports: [Modal, TasksContainer, CommitsGrid, DevStatsIcon, ServicesPlaceholderIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform pb-1"
      (click)="toggleModal()"
      title="Open Dev Stats">
      <dev-stats-icon />
    </div>

    <modal [isOpen]="isModalOpen()" [widthStyle]="'large'" (close)="toggleModal()">
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
          <div [style.display]="activeTab() === 'commits' ? 'block' : 'none'">
            @defer (on immediate) {
              <commits-grid [commits]="filteredCommits()" />
            } @placeholder {
              <div class="text-center py-8 text-gray-400">Loading...</div>
            }
          </div>

          @if (activeTab() === 'services') {
            <div class="services-placeholder">
              <div class="text-center text-gray-400 py-8">
                <services-placeholder-icon class="mx-auto mb-4" />
                <p class="text-sm">Services Status</p>
                <p class="text-xs text-gray-500 mt-2">Coming soon...</p>
              </div>
            </div>
          }

          <div [style.display]="activeTab() === 'tasks' ? 'block' : 'none'">
            <tasks-container [tasks]="tasks()" />
          </div>
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
      background: none !important;
      border: none !important;
      color: #888;
      padding: 8px 16px !important;
      cursor: pointer;
      font-size: 14px;
      border-bottom: 2px solid transparent !important;
      transition: all 0.2s;
      position: relative;
      top: 1px;
      box-shadow: none !important;
      text-transform: none !important;
      margin-top: 0 !important;
      transform: none !important;
    }

    .tab-button:hover {
      color: #4dd8ff;
      transform: none !important;
      box-shadow: none !important;
      border-color: transparent !important;
    }

    .tab-button.active {
      color: #039be5;
      border-bottom-color: #039be5 !important;
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
  protected tasks = toSignal(this.store.select(selectTasks), { initialValue: [] });

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
