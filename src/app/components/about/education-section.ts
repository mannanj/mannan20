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
    <div class="section text-inherit">
      <b>{{ (education$ | async)?.institution }}</b>
      <p>{{ (education$ | async)?.dates }}</p>
      <p>{{ (education$ | async)?.degree }}</p>

      <div id="more-education">
        <div *ngIf="section.display" class="bg-[#f1f1f1] text-black p-1.5 rounded-md" @fadeIn>
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['archr']"></content-card>
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['solar']" [applyMarginTop]="true"></content-card>
          <content-card *ngIf="section.count === 2 && (projects$ | async)" [data]="(projects$ | async)!['dome']" [applyMarginTop]="true"></content-card>
        </div>

        <button *ngIf="section.count < 2" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggle(true)">more</button>
        <button *ngIf="section.count === 2" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggle(false)">less</button>
      </div>
    </div>
  `,
  styles: [`
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
