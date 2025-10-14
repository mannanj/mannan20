import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentCardComponent } from './content-card.component';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection } from './about.constants';
import { EDUCATION, EDUCATION_PROJECTS } from './about.constants';

@Component({
  selector: 'education-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 class="margin-top-60" @slideInLeft>Education</h2>
    <div class="section">
      <b>{{ education.institution }}</b>
      <p>{{ education.dates }}</p>
      <p>{{ education.degree }}</p>

      <div id="more-education">
        <div *ngIf="section.display" class="content" @fadeIn>
          <content-card *ngIf="section.count >= 1" [data]="projects['archr']"></content-card>
          <content-card *ngIf="section.count >= 1" [data]="projects['solar']" [applyMarginTop]="true"></content-card>
          <content-card *ngIf="section.count === 2" [data]="projects['dome']" [applyMarginTop]="true"></content-card>
        </div>

        <button *ngIf="section.count < 2" type="button" class="collapsible" (click)="toggle(true)">more</button>
        <button *ngIf="section.count === 2" type="button" class="collapsible" (click)="toggle(false)">less</button>
      </div>
    </div>
  `,
  styles: [`
    .section {
      color: inherit;
    }

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

    .content {
      background-color: #f1f1f1;
      color: black;
      padding: 6px;
      border-radius: 6px;
    }

    .content .section {
      color: black;
      font-size: 80%;
    }

    .content p {
      color: black;
    }

    .content b {
      color: black;
    }

    .content a {
      color: #039be5;
    }
  `]
})
export class EducationSectionComponent {
  education = EDUCATION;
  projects = EDUCATION_PROJECTS;

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
