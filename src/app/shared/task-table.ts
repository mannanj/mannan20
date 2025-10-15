import { Component, ChangeDetectionStrategy, input, signal, viewChild, OnInit } from '@angular/core';
import { Task } from '../models/models';
import { formatCompletionDate } from '../utils/date';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams, GridState } from 'ag-grid-community';

@Component({
  selector: 'task-table',
  imports: [AgGridAngular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3">
      <input
        type="text"
        placeholder="Search tasks..."
        [value]="searchText()"
        (input)="onSearchChange($event)"
        class="search-input"
      />
    </div>
    @if (gridTheme()) {
      <div style="height: 400px; width: 100%;">
        <ag-grid-angular
          #tasksGrid
          [rowData]="tasks()"
          [columnDefs]="colDefs"
          [theme]="gridTheme()"
          [suppressCellFocus]="true"
          [rowSelection]="{ mode: 'multiRow', enableClickSelection: false }"
          [animateRows]="false"
          [getRowId]="getTaskRowId"
          columnMenu="new"
          [initialState]="initialState()"
          (stateUpdated)="onStateUpdated()"
          style="width: 100%; height: 100%;"
        />
      </div>
    }
  `,
  styles: [`
    .search-input {
      width: 100%;
      padding: 8px 12px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input::placeholder {
      color: #666;
    }

    .search-input:focus {
      border-color: #039be5;
    }
  `]
})
export class TaskTable implements OnInit {
  private static readonly STORAGE_KEY = 'tasks-grid-state';

  tasks = input.required<Task[]>();
  protected searchText = signal('');
  protected gridTheme = signal<any>(null);
  protected initialState = signal<GridState | undefined>(undefined);

  private tasksGrid = viewChild<AgGridAngular>('tasksGrid');

  async ngOnInit() {
    const { themeQuartz } = await import('ag-grid-community');

    this.gridTheme.set(themeQuartz.withParams({
      backgroundColor: '#000',
      foregroundColor: '#fff',
      headerBackgroundColor: '#1a1a1a',
      headerTextColor: '#fff',
      oddRowBackgroundColor: '#0a0a0a',
      headerFontSize: 11,
      headerVerticalPaddingScale: 0.5,
    }));

    this.loadState();
  }

  private loadState() {
    const savedState = localStorage.getItem(TaskTable.STORAGE_KEY);
    if (savedState) {
      try {
        this.initialState.set(JSON.parse(savedState));
      } catch (e) {
        console.error('Failed to parse saved grid state', e);
      }
    }
  }

  protected onStateUpdated() {
    const gridApi = this.tasksGrid()?.api;
    if (gridApi) {
      const state = gridApi.getState();
      localStorage.setItem(TaskTable.STORAGE_KEY, JSON.stringify(state));
    }
  }

  protected getTaskRowId = (params: any) => params.data.id;

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    const gridApi = this.tasksGrid()?.api;
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', value);
    }
  }

  protected colDefs: ColDef[] = [
    {
      field: 'title',
      headerName: 'Task',
      width: 350,
      resizable: true,
      cellStyle: { fontSize: '12px', color: '#fff' }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      resizable: true,
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value;
        if (status === 'completed') {
          return `<span style="padding: 1px 6px; border-radius: 3px; font-size: 8px; text-transform: uppercase; background: #1a4d2e; color: #4ade80; font-weight: 600; display: inline-block;">COMPLETED</span>`;
        }
        return `<span style="padding: 1px 6px; border-radius: 3px; font-size: 8px; text-transform: uppercase; background: #404040; color: #888; font-weight: 600; display: inline-block;">${status.toUpperCase()}</span>`;
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
      valueFormatter: (params) => params.value?.hash || '-',
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
