import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'tasks-toolbar',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tasks-toolbar">
      <div class="view-controls">
        <button
          (click)="viewChange.emit('card')"
          [class.active]="currentView() === 'card'"
          class="view-button"
          title="Card View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button
          (click)="viewChange.emit('table')"
          [class.active]="currentView() === 'table'"
          class="view-button"
          title="Table View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      <button
        (click)="sortToggle.emit()"
        class="sort-button"
        title="Sort by completion date">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5h10M11 9h7M11 13h4"/>
          @if (sortOrder() === 'asc') {
            <path d="M4 16l4 4 4-4M8 20V4"/>
          } @else {
            <path d="M4 8l4-4 4 4M8 4v16"/>
          }
        </svg>
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
