import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentCardComponent } from './content-card.component';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection } from './about.constants';
import { ACTIVITIES, PUBLISHED_WORKS } from './about.constants';

@Component({
  selector: 'extracurriculars-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Extracurriculars</h2>
    <content-card [data]="activities['teaching']" [applyMarginTop]="true"></content-card>

    <div id="more-ec">
      <div *ngIf="section.display" @fadeIn>
        <content-card *ngIf="section.count >= 1" [data]="activities['volunteering']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count >= 1" [data]="activities['travel']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count === 2" [data]="activities['jung']" [applyMarginTop]="true"></content-card>

        <div *ngIf="section.count === 2" class="section margin-top">
          <b>Published Works</b>
          <p *ngFor="let work of publishedWorks" style="font-size: 14px;">
            &#x2022; <a [href]="work.downloadPath" [download]="work.downloadFilename" style="color: #039be5;">{{ work.title }}</a>
          </p>
        </div>
      </div>

      <button *ngIf="section.count < 2" type="button" class="collapsible" (click)="toggle(true)">more</button>
      <button *ngIf="section.count === 2" type="button" class="collapsible" (click)="toggle(false)">less</button>
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

    .section {
      color: inherit;
    }
  `]
})
export class ExtracurricularsSectionComponent {
  activities = ACTIVITIES;
  publishedWorks = PUBLISHED_WORKS;

  section: ExpandableSection = { display: false, count: 0 };

  toggle(expand: boolean): void {
    this.section.display = expand;
    if (expand) {
      this.section.count += 1;
    } else {
      this.section.count = 0;
    }
  }
}
