import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Links, AboutIntro, ExpandableSection } from '../../models/models';
import { fadeIn, scaleIn, slideInLeft, slideInRight } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section';
import { EmploymentSectionComponent } from './employment-section';
import { ExtracurricularsSectionComponent } from './extracurriculars-section';
import { EducationSectionComponent } from './education-section';
import { selectAboutIntro } from '../../store/app.selectors';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'about',
  standalone: true,
  imports: [CommonModule, EmploymentSectionComponent, ExtracurricularsSectionComponent, EducationSectionComponent],
  animations: [fadeIn, scaleIn, slideInLeft, slideInRight],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>About</h1>
      <hr @fadeIn>
      <p class="margin-0 margin-top-25 text-14" @slideInRight>
        {{ (aboutIntro$ | async)?.primary }}
      </p>

      <div id="more-about">
        <div *ngIf="aboutSection.display" @fadeIn>
          <p *ngFor="let paragraph of (aboutIntro$ | async)?.expanded || []" class="text-14 margin-top-12">
            {{ paragraph }}
          </p>
        </div>

        <button *ngIf="!aboutSection.display" type="button" class="collapsible" (click)="toggleAbout(true)">more</button>
        <button *ngIf="aboutSection.display" type="button" class="collapsible" (click)="toggleAbout(false)">less</button>
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

    .text-14 {
      font-size: 14px;
    }

    .margin-top-12 {
      margin-top: 12px;
    }

    .download-link {
      display: block;
      text-align: end;
      color: #039be5;
      cursor: pointer;
      font-size: 14px;
      margin-top: 8px;
      text-decoration: underline;
    }

    .download-link:hover {
      color: #0277bd;
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

    .content .margin-top-12 {
      margin-top: 12px;
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
export class AboutComponent extends BaseSectionComponent {
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
