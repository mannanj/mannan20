import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fadeIn } from '../../animations/animations';

@Component({
  selector: 'expandable-section',
  standalone: true,
  imports: [CommonModule],
  animations: [fadeIn],
  template: `
    <div [id]="sectionId">
      <ng-content select="[content]"></ng-content>

      <div *ngIf="isExpanded" @fadeIn>
        <ng-content select="[expanded]"></ng-content>
      </div>

      <button *ngIf="!isExpanded" type="button" class="collapsible" (click)="toggle()">more</button>
      <button *ngIf="isExpanded" type="button" class="collapsible" (click)="toggle()">less</button>
    </div>
  `,
  styles: [`
    .collapsible {
      background-color: #eee;
      color: #444;
      cursor: pointer;
      border: none;
      text-align: left;
      font-size: 9px;
      border: 1px solid white;
      border-radius: 5px;
      text-transform: lowercase;
      padding: 1px 6px;
      margin-top: 5px;
    }

    .active,
    .collapsible:hover {
      background-color: #ccc;
    }
  `]
})
export class ExpandableSectionComponent {
  @Input() sectionId = '';
  @Input() isExpanded = false;
  @Output() toggle = new EventEmitter<void>();
}
