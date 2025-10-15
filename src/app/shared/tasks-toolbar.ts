import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CardViewIcon } from '../components/icons/card-view-icon';
import { TableViewIcon } from '../components/icons/table-view-icon';
import { SortIcon } from '../components/icons/sort-icon';

@Component({
  selector: 'tasks-toolbar',
  imports: [CardViewIcon, TableViewIcon, SortIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-between items-center px-2 py-1 bg-[#2a2a2a] rounded-md border border-[#404040]">
      <div class="flex gap-1 items-center">
        <button
          (click)="viewChange.emit('card')"
          [class]="currentView() === 'card' ? '!border-0 !shadow-none !bg-[#039be5] !text-white flex items-center justify-center !p-1 !m-0 cursor-pointer !rounded !transform-none !scale-100 !translate-y-0 transition-all duration-200 focus:outline-none' : '!border-0 !shadow-none !bg-[#1a1a1a] !text-[#888] hover:!text-[#4dd8ff] flex items-center justify-center !p-1 !m-0 cursor-pointer !rounded !transform-none !scale-100 !translate-y-0 transition-all duration-200 focus:outline-none'"
          title="Card View">
          <card-view-icon />
        </button>
        <button
          (click)="viewChange.emit('table')"
          [class]="currentView() === 'table' ? '!border-0 !shadow-none !bg-[#039be5] !text-white flex items-center justify-center !p-1 !m-0 cursor-pointer !rounded !transform-none !scale-100 !translate-y-0 transition-all duration-200 focus:outline-none' : '!border-0 !shadow-none !bg-[#1a1a1a] !text-[#888] hover:!text-[#4dd8ff] flex items-center justify-center !p-1 !m-0 cursor-pointer !rounded !transform-none !scale-100 !translate-y-0 transition-all duration-200 focus:outline-none'"
          title="Table View">
          <table-view-icon />
        </button>
      </div>
      <button
        (click)="sortToggle.emit()"
        class="!border-0 !shadow-none !bg-[#1a1a1a] !text-[#888] !px-2 !py-1 !m-0 cursor-pointer !rounded !transform-none !scale-100 !translate-y-0 transition-all duration-200 flex items-center gap-1 !text-xs hover:!text-[#4dd8ff] focus:outline-none"
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
