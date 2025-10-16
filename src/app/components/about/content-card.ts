import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileItem } from '../../models/models';

@Component({
  selector: 'content-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-0 m-0 text-inherit" [class.mt-[10px]]="applyMarginTop">
      <a *ngIf="data.link && data.title" [href]="data.link" target="_blank" class="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
        <b>{{ data.title }}</b>
      </a>
      <a *ngIf="!data.link && data.title" class="text-inherit cursor-default pointer-events-none hover:text-inherit hover:transform-none">
        <b>{{ data.title }}</b>
      </a>
      <br *ngIf="data.title && data.position">
      <b *ngIf="data.title && data.position">{{ data.position }}</b>
      <b *ngIf="!data.title && data.position">{{ data.position }}</b>

      <p *ngIf="data.dates" class="leading-[1.6] m-0 mb-0 text-white">{{ data.dates }}</p>

      <p *ngIf="data.skills" class="text-xs italic mt-0 leading-[1.6] m-0 mb-0 text-white">
        {{ data.skills }}
      </p>

      <p *ngIf="data.description" class="text-xs mt-0 leading-[1.6] m-0 mb-0 text-white" [innerHTML]="data.description"></p>

      <p *ngIf="data.additionalContent" class="text-xs mt-0 leading-[1.6] m-0 mb-0 text-white" [innerHTML]="data.additionalContent"></p>

      <a *ngIf="data.downloadLink"
         [href]="data.downloadLink"
         [download]="data.downloadFilename"
         class="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
        {{ data.downloadLabel }}
      </a>

      <div *ngIf="data.expandedContent">
        <div *ngIf="isExpanded" class="content bg-[#f1f1f1] text-black p-1.5 rounded-md">
          <p class="text-xs mt-0" [innerHTML]="data.expandedContent"></p>
        </div>
        <button *ngIf="!isExpanded" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleExpanded()">more</button>
        <button *ngIf="isExpanded" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleExpanded()">less</button>
      </div>
    </div>
  `,
  styles: [`
    :host-context(.content) > div {
      color: black;
      font-size: 80%;
    }

    :host-context(.content) p {
      color: black !important;
    }

    :host-context(.content) b {
      color: black;
    }

    :host-context(.content) a {
      color: #039be5;
    }
  `]
})
export class ContentCard {
  @Input() data!: ProfileItem;
  @Input() applyMarginTop = false;

  isExpanded = false;

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
