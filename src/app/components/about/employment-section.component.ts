import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentCardComponent } from './content-card.component';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { JOBS } from './about.constants';
import { ProfileItem } from './content-card.component';

@Component({
  selector: 'employment-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Employment History</h2>
    <content-card
      *ngFor="let job of visibleJobs; let i = index"
      [data]="job"
      [applyMarginTop]="true"
      [@fadeIn]="i >= DEFAULT_JOBS_TO_SHOW ? 'in' : ''">
    </content-card>

    <button
      *ngIf="jobsToShow < totalJobs"
      type="button"
      class="collapsible"
      (click)="showMore()">
      more
    </button>
    <button
      *ngIf="jobsToShow >= totalJobs"
      type="button"
      class="collapsible"
      (click)="showLess()">
      less
    </button>
  `,
  styles: []
})
export class EmploymentSectionComponent {
  readonly DEFAULT_JOBS_TO_SHOW = 3;
  readonly JOBS_INCREMENT = 2;

  jobsToShow = this.DEFAULT_JOBS_TO_SHOW;

  get visibleJobs(): ProfileItem[] {
    return JOBS.slice(0, this.jobsToShow);
  }

  get totalJobs(): number {
    return JOBS.length;
  }

  showMore(): void {
    this.jobsToShow = Math.min(this.jobsToShow + this.JOBS_INCREMENT, this.totalJobs);
  }

  showLess(): void {
    this.jobsToShow = this.DEFAULT_JOBS_TO_SHOW;
  }
}
