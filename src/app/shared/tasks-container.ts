import { Component, ChangeDetectionStrategy, input, signal, computed } from '@angular/core';
import { Task } from '../models/models';
import { TaskCard } from './task-card';
import { TaskTable } from './task-table';
import { TasksToolbar } from './tasks-toolbar';

@Component({
  selector: 'tasks-container',
  imports: [TaskCard, TaskTable, TasksToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <tasks-toolbar
        [currentView]="taskView()"
        [sortOrder]="sortOrder()"
        (viewChange)="setTaskView($event)"
        (sortToggle)="toggleSortOrder()" />

      @if (taskView() === 'card') {
        <div class="max-h-[400px] overflow-y-auto flex flex-col gap-4">
          @for (task of sortedTasks(); track task.id) {
            <task-card [task]="task" />
          }
        </div>
      } @else {
        <task-table [tasks]="sortedTasks()" />
      }
    </div>
  `,
  styles: []
})
export class TasksContainer {
  tasks = input.required<Task[]>();

  protected taskView = signal<'card' | 'table'>('card');
  protected sortOrder = signal<'asc' | 'desc'>('desc');

  protected sortedTasks = computed(() => {
    const tasks = this.tasks();
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

  setTaskView(view: 'card' | 'table') {
    this.taskView.set(view);
  }

  toggleSortOrder() {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc');
  }
}
