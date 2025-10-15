import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ContentCard } from './content-card';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection, PublishedWork, ProfileItem } from '../../models/models';
import { selectActivities, selectPublishedWorks } from '../../store/app.selectors';

@Component({
  selector: 'extracurriculars-section',
  standalone: true,
  imports: [CommonModule, ContentCard],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Extracurriculars</h2>
    <content-card *ngIf="activities$ | async" [data]="(activities$ | async)!['teaching']" [applyMarginTop]="true"></content-card>

    <div id="more-ec">
      <div *ngIf="section.display" @fadeIn>
        <content-card *ngIf="section.count >= 1 && (activities$ | async)" [data]="(activities$ | async)!['volunteering']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count >= 1 && (activities$ | async)" [data]="(activities$ | async)!['travel']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count === 2 && (activities$ | async)" [data]="(activities$ | async)!['jung']" [applyMarginTop]="true"></content-card>

        <div *ngIf="section.count === 2" class="section text-inherit margin-top">
          <b>Published Works</b>
          <p *ngFor="let work of (publishedWorks$ | async) || []" class="text-sm">
            &#x2022; <a [href]="work.downloadPath" [download]="work.downloadFilename" class="text-[#039be5]">{{ work.title }}</a>
          </p>
        </div>
      </div>

      <button *ngIf="section.count < 2" type="button" class="collapsible" (click)="toggle(true)">more</button>
      <button *ngIf="section.count === 2" type="button" class="collapsible" (click)="toggle(false)">less</button>
    </div>
  `,
  styles: [`
    .section {
      color: inherit;
    }
  `]
})
export class ExtracurricularsSection {
  activities$: Observable<Record<string, ProfileItem> | undefined>;
  publishedWorks$: Observable<PublishedWork[] | undefined>;

  section: ExpandableSection = { display: false, count: 0 };

  constructor(private store: Store) {
    this.activities$ = this.store.select(selectActivities);
    this.publishedWorks$ = this.store.select(selectPublishedWorks);
  }

  toggle(expand: boolean): void {
    this.section.display = expand;
    if (expand) {
      this.section.count += 1;
    } else {
      this.section.count = 0;
    }
  }
}
