import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Task } from '../models/models';
import { formatCompletionDate } from '../utils/date';

@Component({
  selector: 'task-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tasks-table-container">
      <table class="tasks-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Completed</th>
            <th>Commit</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          @for (task of tasks(); track task.id) {
            <tr>
              <td class="task-name">{{ task.title }}</td>
              <td>
                <span class="task-status-badge" [class.completed]="task.status === 'completed'">
                  {{ task.status }}
                </span>
              </td>
              <td class="completion-cell">
                @if (task.completedDate) {
                  <span>{{ formatDate(task.completedDate!) }}</span>
                } @else {
                  <span class="text-gray-600">-</span>
                }
              </td>
              <td class="commit-cell">
                @if (task.completedCommit) {
                  <a [href]="task.completedCommit.url" target="_blank" class="commit-link">
                    {{ task.completedCommit.hash }}
                  </a>
                } @else {
                  <span class="text-gray-600">-</span>
                }
              </td>
              <td class="progress-cell">
                {{ getCompletedCount(task) }}/{{ task.subtasks.length }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tasks-table-container {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: auto;
    }

    .tasks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .tasks-table thead {
      background: #2a2a2a;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .tasks-table th {
      text-align: left;
      padding: 8px 12px;
      color: #888;
      font-weight: 600;
      border-bottom: 1px solid #404040;
    }

    .tasks-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #333;
      color: #ccc;
    }

    .tasks-table tbody tr:hover {
      background: #2a2a2a;
    }

    .task-name {
      color: #fff;
      font-weight: 500;
    }

    .task-status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
      background: #404040;
      color: #888;
      font-weight: 600;
      display: inline-block;
    }

    .task-status-badge.completed {
      background: #1a4d2e;
      color: #4ade80;
    }

    .completion-cell {
      color: #4ade80;
    }

    .commit-link {
      color: #039be5;
      text-decoration: none;
      font-family: monospace;
    }

    .commit-link:hover {
      text-decoration: underline;
    }

    .progress-cell {
      color: #888;
      font-family: monospace;
    }

    .text-gray-600 {
      color: #666;
    }
  `]
})
export class TaskTable {
  tasks = input.required<Task[]>();

  formatDate = formatCompletionDate;

  getCompletedCount(task: Task): number {
    return task.subtasks.filter(st => st.completed).length;
  }
}
