import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentCardComponent } from './content-card.component';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection } from './about.constants';
import { JOBS } from './about.constants';

@Component({
  selector: 'employment-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Employment History</h2>
    <content-card [data]="jobs['capitalOne']" [applyMarginTop]="true"></content-card>
    <content-card [data]="jobs['publicis']" [applyMarginTop]="true"></content-card>
    <content-card [data]="jobs['radiant']" [applyMarginTop]="true"></content-card>

    <div id="more-jobs">
      <div *ngIf="sections.jobs.display" @fadeIn>
        <content-card [data]="jobs['mitre']" [applyMarginTop]="true"></content-card>
        <content-card [data]="jobs['mealFairy']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="sections.jobs.count === 2"  [data]="jobs['coop']" [applyMarginTop]="true"></content-card>
      </div>

      <button *ngIf="sections.jobs.count < 2" type="button" class="collapsible" (click)="toggleJobs(true)">more</button>
      <button *ngIf="sections.jobs.count === 2" type="button" class="collapsible" (click)="toggleJobs(false)">less</button>
    </div>
  `,
  styles: []
})
export class EmploymentSectionComponent {
  jobs = JOBS;

  sections: { jobs: ExpandableSection } = {
    jobs: { display: false, count: 0 }
  };

  toggleJobs(expand: boolean): void {
    this.sections.jobs.display = expand;
    if (expand) {
      this.sections.jobs.count += 1;
    } else {
      this.sections.jobs.count = 0;
    }
  }
}
