import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ContentCardComponent } from './content-card.component';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ProfileItem } from '../../models/models';
import { selectJobs } from '../../store/app.selectors';

@Component({
  selector: 'employment-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Employment History</h2>
    <content-card
      *ngFor="let job of visibleJobs$ | async; let i = index"
      [data]="job"
      [applyMarginTop]="true"
      [@fadeIn]="i >= DEFAULT_JOBS_TO_SHOW ? 'in' : ''">
    </content-card>

    <button
      *ngIf="(totalJobs$ | async) && jobsToShow < (totalJobs$ | async)!"
      type="button"
      class="collapsible"
      (click)="showMore()">
      more
    </button>
    <button
      *ngIf="(totalJobs$ | async) && jobsToShow >= (totalJobs$ | async)!"
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
  jobs$: Observable<ProfileItem[] | undefined>;
  visibleJobs$: Observable<ProfileItem[]>;
  totalJobs$: Observable<number>;

  constructor(private store: Store) {
    this.jobs$ = this.store.select(selectJobs);
    this.visibleJobs$ = this.jobs$.pipe(
      map(jobs => jobs?.slice(0, this.jobsToShow) || [])
    );
    this.totalJobs$ = this.jobs$.pipe(
      map(jobs => jobs?.length || 0)
    );
  }

  showMore(): void {
    this.jobs$.subscribe(jobs => {
      const total = jobs?.length || 0;
      this.jobsToShow = Math.min(this.jobsToShow + this.JOBS_INCREMENT, total);
      this.updateVisibleJobs();
    }).unsubscribe();
  }

  showLess(): void {
    this.jobsToShow = this.DEFAULT_JOBS_TO_SHOW;
    this.updateVisibleJobs();
  }

  private updateVisibleJobs(): void {
    this.visibleJobs$ = this.jobs$.pipe(
      map(jobs => jobs?.slice(0, this.jobsToShow) || [])
    );
  }
}
