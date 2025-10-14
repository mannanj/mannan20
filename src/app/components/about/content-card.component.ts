import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProfileItem {
  title?: string;
  link?: string;
  dates?: string;
  position?: string;
  skills?: string;
  description?: string;
  expandedContent?: string;
  additionalContent?: string;
  downloadLink?: string;
  downloadLabel?: string;
  downloadFilename?: string;
}

@Component({
  selector: 'content-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section" [class.margin-top]="applyMarginTop">
      <a *ngIf="data.link && data.title" [href]="data.link" target="_blank">
        <b>{{ data.title }}</b>
      </a>
      <a *ngIf="!data.link && data.title">
        <b>{{ data.title }}</b>
      </a>
      <br *ngIf="data.title && data.position">
      <b *ngIf="data.title && data.position">{{ data.position }}</b>
      <b *ngIf="!data.title && data.position">{{ data.position }}</b>

      <p *ngIf="data.dates">{{ data.dates }}</p>

      <p *ngIf="data.skills" style="font-size: 12px; font-style: italic; margin-top: 6px;">
        {{ data.skills }}
      </p>

      <p *ngIf="data.description" style="font-size: 12px; margin-top: 6px;" [innerHTML]="data.description"></p>

      <p *ngIf="data.additionalContent" style="font-size: 12px; margin-top: 6px;" [innerHTML]="data.additionalContent"></p>

      <a *ngIf="data.downloadLink"
         [href]="data.downloadLink"
         [download]="data.downloadFilename"
         style="color: #039be5;">
        {{ data.downloadLabel }}
      </a>
    </div>
  `,
  styles: [`
    .section {
      color: inherit;
    }

    a:not([href]) {
      color: inherit;
      cursor: default;
      pointer-events: none;
    }

    a:not([href]):hover {
      color: inherit;
      transform: none;
    }

    :host-context(.content) .section {
      color: black;
      font-size: 80%;
    }

    :host-context(.content) p {
      color: black;
    }

    :host-context(.content) b {
      color: black;
    }

    :host-context(.content) a {
      color: #039be5;
    }
  `]
})
export class ContentCardComponent {
  @Input() data!: ProfileItem;
  @Input() applyMarginTop = false;
}
