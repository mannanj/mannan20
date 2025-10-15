import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Links, AboutIntro, ExpandableSection } from '../../models/models';
import { fadeIn, scaleIn, slideInLeft, slideInRight } from '../../animations/animations';
import { BaseSection } from '../../shared/base-section';
import { EmploymentSection } from './employment-section';
import { ExtracurricularsSection } from './extracurriculars-section';
import { EducationSection } from './education-section';
import { selectAboutIntro } from '../../store/app.selectors';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'about',
  standalone: true,
  imports: [CommonModule, EmploymentSection, ExtracurricularsSection, EducationSection],
  animations: [fadeIn, scaleIn, slideInLeft, slideInRight],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>About</h1>
      <hr @fadeIn>
      <p class="m-0 mt-[25px] text-sm" @slideInRight>
        {{ (aboutIntro$ | async)?.primary }}
      </p>

      <div id="more-about">
        <div *ngIf="aboutSection.display" @fadeIn>
          <p *ngFor="let paragraph of (aboutIntro$ | async)?.expanded || []" class="text-sm mt-3">
            {{ paragraph }}
          </p>
        </div>

        <button *ngIf="!aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(true)">more</button>
        <button *ngIf="aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white rounded-[5px] text-left text-[9px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(false)">less</button>
      </div>

      <employment-section></employment-section>

      <extracurriculars-section></extracurriculars-section>

      <education-section></education-section>

      <button (click)="goToContact()" class="margin-top-60">Get In Touch</button>
    </div>
  `,
  styles: [`
    #main a:not([href]) {
      color: inherit;
      cursor: default;
      pointer-events: none;
    }

    #main a:not([href]):hover {
      color: inherit;
      transform: none;
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
export class About extends BaseSection {
  protected sectionLink = Links.about;
  private localStore = inject(Store);
  aboutIntro$: Observable<AboutIntro | undefined> = this.localStore.select(selectAboutIntro);
  aboutSection: ExpandableSection = { display: false, count: 0 };

  toggleAbout(expand: boolean): void {
    this.aboutSection.display = expand;
    if (expand) {
      this.aboutSection.count += 1;
    } else {
      this.aboutSection.count = 0;
    }
  }

  goToContact(): void {
    navigateTo(this.store, Links.contact);
  }
}
