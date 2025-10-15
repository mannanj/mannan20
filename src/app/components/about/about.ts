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
    <div id="about-main">
      <h1 class="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]" @scaleIn>About</h1>
      <hr class="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" @fadeIn>
      <p class="m-0 mt-[25px] text-sm leading-[1.6] text-white" @slideInRight>
        {{ (aboutIntro$ | async)?.primary }}
      </p>

      <div id="more-about-intro">
        <div *ngIf="aboutSection.display" @fadeIn>
          <p *ngFor="let paragraph of (aboutIntro$ | async)?.expanded || []" class="text-sm mt-3 leading-[1.6] text-white">
            {{ paragraph }}
          </p>
        </div>

        <button *ngIf="!aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(true)">more</button>
        <button *ngIf="aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(false)">less</button>
      </div>

      <employment-section></employment-section>

      <extracurriculars-section></extracurriculars-section>

      <education-section></education-section>

      <button (click)="goToContact()" class="uppercase py-2 px-[25px] mt-[60px] transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] relative overflow-hidden border-2 border-[#039be5] bg-transparent text-white shadow-[0_4px_15px_0_rgba(3,155,229,0.2)] hover:scale-[1.08] hover:-translate-y-0.5 hover:cursor-pointer hover:shadow-[0_8px_25px_0_rgba(3,155,229,0.4)] hover:border-[#4fc3f7] active:scale-[1.02] active:translate-y-0 active:shadow-[0_4px_15px_0_rgba(3,155,229,0.3)] before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:w-0 before:h-0 before:rounded-full before:bg-[rgba(3,155,229,0.3)] before:-translate-x-1/2 before:-translate-y-1/2 before:transition-[width,height] before:duration-[600ms] hover:before:w-[300px] hover:before:h-[300px]">Get In Touch</button>
    </div>
  `,
  styles: []
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
