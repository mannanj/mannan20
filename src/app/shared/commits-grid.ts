import { Component, ChangeDetectionStrategy, input, inject, signal, viewChild, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

interface Commit {
  hash: string;
  subject: string;
  author: string;
  date: string;
  url: string;
}

@Component({
  selector: 'commits-grid',
  imports: [AgGridAngular],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3">
      <input
        type="text"
        placeholder="Search commits..."
        [value]="searchText()"
        (input)="onSearchChange($event)"
        class="search-input"
      />
    </div>
    @if (gridTheme()) {
      <div style="height: 400px; width: 100%;">
        <ag-grid-angular
          #commitsGrid
          [rowData]="commits()"
          [columnDefs]="colDefs"
          [theme]="gridTheme()"
          [suppressCellFocus]="true"
          [suppressRowClickSelection]="true"
          [animateRows]="false"
          [getRowId]="getCommitRowId"
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
export class CommitsGrid implements OnInit {
  commits = input.required<Commit[]>();
  protected searchText = signal('');
  protected gridTheme = signal<any>(null);

  private datePipe = inject(DatePipe);
  private commitsGrid = viewChild<AgGridAngular>('commitsGrid');

  async ngOnInit() {
    const { ModuleRegistry, AllCommunityModule, themeQuartz } = await import('ag-grid-community');
    ModuleRegistry.registerModules([AllCommunityModule]);

    this.gridTheme.set(themeQuartz.withParams({
      backgroundColor: '#000',
      foregroundColor: '#fff',
      headerBackgroundColor: '#1a1a1a',
      headerTextColor: '#fff',
      oddRowBackgroundColor: '#0a0a0a',
      headerFontSize: 11,
      headerVerticalPaddingScale: 0.5,
    }));
  }

  protected getCommitRowId = (params: any) => params.data.hash;

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    const gridApi = this.commitsGrid()?.api;
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', value);
    }
  }

  protected colDefs: ColDef[] = [
    {
      field: 'hash',
      headerName: 'Hash',
      width: 100,
      resizable: true,
      cellRenderer: (params: ICellRendererParams) => {
        return `<a href="${params.data.url}" target="_blank" style="color: #039be5; font-family: monospace; font-size: 12px; text-decoration: none;">${params.value}</a>`;
      }
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      resizable: true,
      cellStyle: { fontSize: '12px', color: '#d1d1d1' }
    },
    {
      field: 'author',
      headerName: 'Author',
      width: 120,
      resizable: true,
      cellStyle: { fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis' }
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 180,
      resizable: true,
      valueFormatter: (params) => this.datePipe.transform(params.value, 'MMM d, y h:mm a') || '',
      cellStyle: { fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }
    }
  ];
}
