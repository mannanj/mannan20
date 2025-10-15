import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ContentCard } from './content-card';
import { fadeIn, slideInLeft } from '../../animations/animations';
import { ExpandableSection, EducationInfo, ProfileItem } from '../../models/models';
import { selectEducation, selectEducationProjects } from '../../store/app.selectors';

@Component({
  selector: 'education-section',
  standalone: true,
  imports: [CommonModule, ContentCard],
  animations: [fadeIn, slideInLeft],
  template: `
    <h2 class="margin-top-60" @slideInLeft>Education</h2>
    <div class="section">
      <b>{{ (education$ | async)?.institution }}</b>
      <p>{{ (education$ | async)?.dates }}</p>
      <p>{{ (education$ | async)?.degree }}</p>

      <div id="more-education">
        <div *ngIf="section.display" class="content" @fadeIn>
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['archr']"></content-card>
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['solar']" [applyMarginTop]="true"></content-card>
          <content-card *ngIf="section.count === 2 && (projects$ | async)" [data]="(projects$ | async)!['dome']" [applyMarginTop]="true"></content-card>
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
export class EducationSection {
  education$: Observable<EducationInfo | undefined>;
  projects$: Observable<Record<string, ProfileItem> | undefined>;

  section: ExpandableSection = { display: false, count: 0 };

  constructor(private store: Store) {
    this.education$ = this.store.select(selectEducation);
    this.projects$ = this.store.select(selectEducationProjects);
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
