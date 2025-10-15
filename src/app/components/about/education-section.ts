import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ContentCard } from './content-card';
import { ExpandableSection, EducationInfo, ProfileItem } from '../../models/models';
import { selectEducation, selectEducationProjects } from '../../store/app.selectors';

@Component({
  selector: 'education-section',
  standalone: true,
  imports: [CommonModule, ContentCard],
  template: `
    <h2 class="text-[2em] mt-[60px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">Education</h2>
    <div class="p-0 m-0 text-inherit">
      <b>{{ (education$ | async)?.institution }}</b>
      <p class="leading-[1.6] m-0 mb-[1em] text-white">{{ (education$ | async)?.dates }}</p>
      <p class="leading-[1.6] m-0 mb-[1em] text-white">{{ (education$ | async)?.degree }}</p>

      <div id="more-education" class="mt-1.5">
        <div *ngIf="section.display" class="content bg-[#f1f1f1] text-black p-1.5 rounded-md">
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['archr']"></content-card>
          <content-card *ngIf="section.count >= 1 && (projects$ | async)" [data]="(projects$ | async)!['solar']" [applyMarginTop]="true"></content-card>
          <content-card *ngIf="section.count === 2 && (projects$ | async)" [data]="(projects$ | async)!['dome']" [applyMarginTop]="true"></content-card>
        </div>

        <button *ngIf="section.count < 2" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggle(true)">more</button>
        <button *ngIf="section.count === 2" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggle(false)">less</button>
      </div>
    </div>
  `,
  styles: []
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
