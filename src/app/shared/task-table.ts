import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Task } from '../models/models';
import { formatCompletionDate } from '../utils/date';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'task-table',
  imports: [AgGridAngular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ag-grid-angular
      class="ag-theme-quartz-dark"
      [rowData]="tasks()"
      [columnDefs]="colDefs"
      [domLayout]="'autoHeight'"
      [suppressCellFocus]="true"
      style="width: 100%; max-height: 400px;"
    />
  `,
  styles: []
})
export class TaskTable {
  tasks = input.required<Task[]>();

  protected colDefs: ColDef[] = [
    {
      field: 'title',
      headerName: 'Task',
      flex: 1,
      resizable: true,
      cellStyle: { fontSize: '12px', color: '#fff', fontWeight: '500' }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      resizable: true,
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        if (status === 'completed') {
          return `<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase; background: #1a4d2e; color: #4ade80; font-weight: 600; display: inline-block;">COMPLETED</span>`;
        }
        return `<span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; text-transform: uppercase; background: #404040; color: #888; font-weight: 600; display: inline-block;">${status.toUpperCase()}</span>`;
      }
    },
    {
      field: 'completedDate',
      headerName: 'Completed',
      width: 160,
      resizable: true,
      valueFormatter: (params) => params.value ? formatCompletionDate(params.value) : '-',
      cellStyle: (params) => ({
        fontSize: '12px',
        color: params.value ? '#4ade80' : '#666',
        whiteSpace: 'nowrap'
      })
    },
    {
      field: 'completedCommit',
      headerName: 'Commit',
      width: 100,
      resizable: true,
      cellRenderer: (params: ICellRendererParams) => {
        if (params.value) {
          return `<a href="${params.value.url}" target="_blank" style="color: #039be5; font-family: monospace; font-size: 12px; text-decoration: none;">${params.value.hash}</a>`;
        }
        return '<span style="color: #666;">-</span>';
      }
    },
    {
      field: 'subtasks',
      headerName: 'Progress',
      width: 100,
      resizable: true,
      valueGetter: (params) => {
        const completed = params.data.subtasks.filter((st: any) => st.completed).length;
        const total = params.data.subtasks.length;
        return `${completed}/${total}`;
      },
      cellStyle: { fontSize: '12px', color: '#888', fontFamily: 'monospace', whiteSpace: 'nowrap' }
    }
  ];
}
