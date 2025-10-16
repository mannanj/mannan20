import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ContentCard } from './content-card';
import { ProfileItem } from '../../models/models';
import { selectJobs } from '../../store/app.selectors';

@Component({
  selector: 'employment-section',
  standalone: true,
  imports: [CommonModule, ContentCard],
  template: `
    <h2 class="text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">Employment History</h2>
    <content-card
      *ngFor="let job of visibleJobs$ | async"
      [data]="job"
      [applyMarginTop]="true">
    </content-card>

    <button
      *ngIf="(totalJobs$ | async) && jobsToShow < (totalJobs$ | async)!"
      type="button"
      class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
      (click)="showMore()">
      more
    </button>
    <button
      *ngIf="(totalJobs$ | async) && jobsToShow >= (totalJobs$ | async)!"
      type="button"
      class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
      (click)="showLess()">
      less
    </button>
  `,
  styles: []
})
export class EmploymentSection {
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
