import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Task } from '../models/models';

@Component({
  selector: 'task-card',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="task-card">
      <div class="task-header">
        <h3 class="task-title">{{ task().title }}</h3>
        <span class="task-status" [class.completed]="task().status === 'completed'">
          {{ task().status }}
        </span>
      </div>
      @if (task().completedDate && task().completedCommit) {
        <div class="task-completion">
          <span class="completion-label">Completed:</span>
          <span class="completion-date">{{ task().completedDate | date: 'MMM d, y' }}</span>
          <a [href]="task().completedCommit!.url" target="_blank" class="completion-commit">
            {{ task().completedCommit!.hash }}
          </a>
        </div>
      }
      <div class="task-subtasks">
        @for (subtask of task().subtasks; track subtask.description) {
          <div class="subtask">
            <input type="checkbox" [checked]="subtask.completed" disabled />
            <span [class.completed]="subtask.completed">{{ subtask.description }}</span>
          </div>
        }
      </div>
      <div class="task-location">
        <span class="text-xs text-gray-500">{{ task().location }}</span>
      </div>
    </div>
  `,
  styles: [`
    .task-card {
      background: #2a2a2a;
      border: 1px solid #404040;
      border-radius: 8px;
      padding: 12px;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .task-title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .task-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
      background: #404040;
      color: #888;
      font-weight: 600;
    }

    .task-status.completed {
      background: #1a4d2e;
      color: #4ade80;
    }

    .task-completion {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 11px;
    }

    .completion-label {
      color: #888;
    }

    .completion-date {
      color: #4ade80;
      font-weight: 600;
    }

    .completion-commit {
      color: #039be5;
      text-decoration: none;
      font-family: monospace;
    }

    .completion-commit:hover {
      text-decoration: underline;
    }

    .task-subtasks {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }

    .subtask {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #ccc;
    }

    .subtask input[type="checkbox"] {
      cursor: not-allowed;
    }

    .subtask span.completed {
      text-decoration: line-through;
      color: #666;
    }

    .task-location {
      padding-top: 8px;
      border-top: 1px solid #333;
    }
  `]
})
export class TaskCard {
  task = input.required<Task>();
}
