import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Task } from '../models/models';
import { formatCompletionDate } from '../utils/date';

@Component({
  selector: 'task-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-h-[400px] overflow-y-auto overflow-x-auto">
      <table class="w-full border-collapse text-xs">
        <thead class="bg-[#2a2a2a] sticky top-0 z-[1]">
          <tr>
            <th class="text-left py-2 px-3 text-[#888] font-semibold border-b border-[#404040]">Task</th>
            <th class="text-left py-2 px-3 text-[#888] font-semibold border-b border-[#404040]">Status</th>
            <th class="text-left py-2 px-3 text-[#888] font-semibold border-b border-[#404040]">Completed</th>
            <th class="text-left py-2 px-3 text-[#888] font-semibold border-b border-[#404040]">Commit</th>
            <th class="text-left py-2 px-3 text-[#888] font-semibold border-b border-[#404040]">Progress</th>
          </tr>
        </thead>
        <tbody>
          @for (task of tasks(); track task.id) {
            <tr class="hover:bg-[#2a2a2a]">
              <td class="py-2 px-3 border-b border-[#333] text-white font-medium">{{ task.title }}</td>
              <td class="py-2 px-3 border-b border-[#333] text-[#ccc]">
                <span [class]="task.status === 'completed' ? 'py-0.5 px-2 rounded text-[10px] uppercase bg-[#1a4d2e] text-[#4ade80] font-semibold inline-block' : 'py-0.5 px-2 rounded text-[10px] uppercase bg-[#404040] text-[#888] font-semibold inline-block'">
                  {{ task.status }}
                </span>
              </td>
              <td class="py-2 px-3 border-b border-[#333] text-[#4ade80]">
                @if (task.completedDate) {
                  <span>{{ formatDate(task.completedDate!) }}</span>
                } @else {
                  <span class="text-[#666]">-</span>
                }
              </td>
              <td class="py-2 px-3 border-b border-[#333] text-[#ccc]">
                @if (task.completedCommit) {
                  <a [href]="task.completedCommit.url" target="_blank" class="text-[#039be5] no-underline font-mono hover:underline">
                    {{ task.completedCommit.hash }}
                  </a>
                } @else {
                  <span class="text-[#666]">-</span>
                }
              </td>
              <td class="py-2 px-3 border-b border-[#333] text-[#888] font-mono">
                {{ getCompletedCount(task) }}/{{ task.subtasks.length }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: []
})
export class TaskTable {
  tasks = input.required<Task[]>();

  formatDate = formatCompletionDate;

  getCompletedCount(task: Task): number {
    return task.subtasks.filter(st => st.completed).length;
  }
}
