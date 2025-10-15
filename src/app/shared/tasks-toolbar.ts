import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CardViewIcon } from '../components/icons/card-view-icon';
import { TableViewIcon } from '../components/icons/table-view-icon';
import { SortIcon } from '../components/icons/sort-icon';

@Component({
  selector: 'tasks-toolbar',
  imports: [CardViewIcon, TableViewIcon, SortIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tasks-toolbar">
      <div class="view-controls">
        <button
          (click)="viewChange.emit('card')"
          [class.active]="currentView() === 'card'"
          class="view-button"
          title="Card View">
          <card-view-icon />
        </button>
        <button
          (click)="viewChange.emit('table')"
          [class.active]="currentView() === 'table'"
          class="view-button"
          title="Table View">
          <table-view-icon />
        </button>
      </div>
      <button
        (click)="sortToggle.emit()"
        class="sort-button"
        title="Sort by completion date">
        <sort-icon [direction]="sortOrder()" />
        {{ sortOrder() === 'asc' ? 'Oldest First' : 'Newest First' }}
      </button>
    </div>
  `,
  styles: [`
    .tasks-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 6px;
      border: 1px solid #404040;
    }

    .view-controls {
      display: flex;
      gap: 4px;
    }

    .view-button {
      background: #1a1a1a;
      border: 1px solid #404040;
      color: #888;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-button:hover {
      color: #4dd8ff;
      border-color: #4dd8ff;
    }

    .view-button.active {
      background: #039be5;
      color: white;
      border-color: #039be5;
    }

    .sort-button {
      background: #1a1a1a;
      border: 1px solid #404040;
      color: #888;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .sort-button:hover {
      color: #4dd8ff;
      border-color: #4dd8ff;
    }
  `]
})
export class TasksToolbar {
  currentView = input.required<'card' | 'table'>();
  sortOrder = input.required<'asc' | 'desc'>();
  viewChange = output<'card' | 'table'>();
  sortToggle = output<void>();
}
