import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Task } from '../models/models';
import { formatCompletionDate } from '../utils/date';

@Component({
  selector: 'task-card',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-[#2a2a2a] border border-[#404040] rounded-lg p-3">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-semibold text-white m-0">{{ task().title }}</h3>
        <span [class]="task().status === 'completed' ? 'py-[3px] px-[2px] rounded text-[10px] uppercase bg-[#22c55e] text-[#4ade80] font-semibold inline-block leading-none' : 'py-0.5 px-2 rounded text-[10px] uppercase bg-[#404040] text-[#888] font-semibold'">
          {{ task().status }}
        </span>
      </div>
      @if (task().completedDate && task().completedCommit) {
        <div class="flex items-center gap-2 mb-2 text-[11px]">
          <span class="text-[#888]">Completed:</span>
          <span class="text-[#4ade80] font-semibold">{{ formatDate(task().completedDate!) }}</span>
          <a [href]="task().completedCommit!.url" target="_blank" class="text-[#039be5] no-underline font-mono hover:underline focus:outline-none">
            {{ task().completedCommit!.hash }}
          </a>
        </div>
      }
      <div class="flex flex-col gap-2 mb-2">
        @for (subtask of task().subtasks; track subtask.description) {
          <div class="flex items-center gap-2 text-xs text-[#ccc]">
            <input type="checkbox" [checked]="subtask.completed" disabled class="cursor-not-allowed focus:outline-none" />
            <span [class.line-through]="subtask.completed" [class.text-[#666]]="subtask.completed">{{ subtask.description }}</span>
          </div>
        }
      </div>
      <div class="pt-2 border-t border-[#333]">
        <span class="text-xs text-gray-500">{{ task().location }}</span>
      </div>
    </div>
  `,
  styles: []
})
export class TaskCard {
  task = input.required<Task>();

  formatDate = formatCompletionDate;
}
