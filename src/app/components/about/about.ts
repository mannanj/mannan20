import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Links, AboutIntro, ExpandableSection } from '../../models/models';
import { EmploymentSection } from './employment-section';
import { ExtracurricularsSection } from './extracurriculars-section';
import { EducationSection } from './education-section';
import { selectAboutIntro } from '../../store/app.selectors';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'about',
  standalone: true,
  imports: [CommonModule, EmploymentSection, ExtracurricularsSection, EducationSection],
  template: `
    <div>
      <h1 class="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">About</h1>
      <hr class="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5">
      <p class="m-0 text-sm leading-[1.6] text-white">
        {{ (aboutIntro$ | async)?.primary }}
      </p>

      <div id="more-about-intro">
        <div *ngIf="aboutSection.display">
          <p *ngFor="let paragraph of (aboutIntro$ | async)?.expanded || []" class="text-sm m-0 leading-[1.6] text-white">
            {{ paragraph }}
          </p>
        </div>

        <button *ngIf="!aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(true)">more</button>
        <button *ngIf="aboutSection.display" type="button" class="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]" (click)="toggleAbout(false)">less</button>
      </div>

      <employment-section></employment-section>

      <extracurriculars-section></extracurriculars-section>

      <education-section></education-section>

      <button (click)="goToContact()" class="nav-button mt-[60px]">Get In Touch</button>
    </div>
  `,
  styles: []
})
export class About {
  private store = inject(Store);
  aboutIntro$: Observable<AboutIntro | undefined> = this.store.select(selectAboutIntro);
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
