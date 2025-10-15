import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ContentCardComponent } from './content-card';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection, PublishedWork, ProfileItem } from '../../models/models';
import { selectActivities, selectPublishedWorks } from '../../store/app.selectors';

@Component({
  selector: 'extracurriculars-section',
  standalone: true,
  imports: [CommonModule, ContentCardComponent],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 @slideInLeft>Extracurriculars</h2>
    <content-card *ngIf="activities$ | async" [data]="(activities$ | async)!['teaching']" [applyMarginTop]="true"></content-card>

    <div id="more-ec">
      <div *ngIf="section.display" @fadeIn>
        <content-card *ngIf="section.count >= 1 && (activities$ | async)" [data]="(activities$ | async)!['volunteering']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count >= 1 && (activities$ | async)" [data]="(activities$ | async)!['travel']" [applyMarginTop]="true"></content-card>
        <content-card *ngIf="section.count === 2 && (activities$ | async)" [data]="(activities$ | async)!['jung']" [applyMarginTop]="true"></content-card>

        <div *ngIf="section.count === 2" class="section margin-top">
          <b>Published Works</b>
          <p *ngFor="let work of (publishedWorks$ | async) || []" style="font-size: 14px;">
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
