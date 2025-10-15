import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fadeIn } from '../../animations/animations';
import { ProfileItem } from '../../models/models';

@Component({
  selector: 'content-card',
  standalone: true,
  imports: [CommonModule],
  animations: [fadeIn],
  template: `
    <div class="section text-inherit" [class.margin-top]="applyMarginTop">
      <a *ngIf="data.link && data.title" [href]="data.link" target="_blank">
        <b>{{ data.title }}</b>
      </a>
      <a *ngIf="!data.link && data.title" class="text-inherit cursor-default pointer-events-none hover:text-inherit hover:transform-none">
        <b>{{ data.title }}</b>
      </a>
      <br *ngIf="data.title && data.position">
      <b *ngIf="data.title && data.position">{{ data.position }}</b>
      <b *ngIf="!data.title && data.position">{{ data.position }}</b>

      <p *ngIf="data.dates">{{ data.dates }}</p>

      <p *ngIf="data.skills" class="text-xs italic mt-1.5">
        {{ data.skills }}
      </p>

      <p *ngIf="data.description" class="text-xs mt-1.5" [innerHTML]="data.description"></p>

      <p *ngIf="data.additionalContent" class="text-xs mt-1.5" [innerHTML]="data.additionalContent"></p>

      <a *ngIf="data.downloadLink"
         [href]="data.downloadLink"
         [download]="data.downloadFilename"
         class="text-[#039be5]">
        {{ data.downloadLabel }}
      </a>

      <div *ngIf="data.expandedContent">
        <div *ngIf="isExpanded" class="bg-[#f1f1f1] text-black p-1.5 rounded-md" @fadeIn>
          <p class="text-xs mt-1.5" [innerHTML]="data.expandedContent"></p>
        </div>
        <button *ngIf="!isExpanded" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleExpanded()">more</button>
        <button *ngIf="isExpanded" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleExpanded()">less</button>
      </div>
    </div>
  `,
  styles: [`
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
export class ContentCard {
  @Input() data!: ProfileItem;
  @Input() applyMarginTop = false;

  isExpanded = false;

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
