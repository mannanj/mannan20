import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CardViewIcon } from '../components/icons/card-view-icon';
import { TableViewIcon } from '../components/icons/table-view-icon';
import { SortIcon } from '../components/icons/sort-icon';

@Component({
  selector: 'tasks-toolbar',
  imports: [CardViewIcon, TableViewIcon, SortIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-between items-center p-2 bg-[#2a2a2a] rounded-md border border-[#404040]">
      <div class="flex gap-1">
        <button
          (click)="viewChange.emit('card')"
          [class]="currentView() === 'card' ? 'bg-[#039be5] text-white border-[#039be5] flex items-center justify-center px-2 py-1.5 cursor-pointer rounded border transition-all duration-200' : 'bg-[#1a1a1a] border-[#404040] text-[#888] hover:text-[#4dd8ff] hover:border-[#4dd8ff] flex items-center justify-center px-2 py-1.5 cursor-pointer rounded border transition-all duration-200'"
          title="Card View">
          <card-view-icon />
        </button>
        <button
          (click)="viewChange.emit('table')"
          [class]="currentView() === 'table' ? 'bg-[#039be5] text-white border-[#039be5] flex items-center justify-center px-2 py-1.5 cursor-pointer rounded border transition-all duration-200' : 'bg-[#1a1a1a] border-[#404040] text-[#888] hover:text-[#4dd8ff] hover:border-[#4dd8ff] flex items-center justify-center px-2 py-1.5 cursor-pointer rounded border transition-all duration-200'"
          title="Table View">
          <table-view-icon />
        </button>
      </div>
      <button
        (click)="sortToggle.emit()"
        class="bg-[#1a1a1a] border border-[#404040] text-[#888] px-3 py-1.5 cursor-pointer rounded transition-all duration-200 flex items-center gap-1.5 text-xs hover:text-[#4dd8ff] hover:border-[#4dd8ff]"
        title="Sort by completion date">
        <sort-icon [direction]="sortOrder()" />
        {{ sortOrder() === 'asc' ? 'Oldest First' : 'Newest First' }}
      </button>
    </div>
  `,
  styles: []
})
export class TasksToolbar {
  currentView = input.required<'card' | 'table'>();
  sortOrder = input.required<'asc' | 'desc'>();
  viewChange = output<'card' | 'table'>();
  sortToggle = output<void>();
}
