import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { bounceIn, fadeIn, slideInLeft } from '../../animations/animations';
import { BaseSection } from '../../shared/base-section';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'home',
  standalone: true,
  imports: [CommonModule],
  animations: [bounceIn, fadeIn, slideInLeft],
  template: `
    <div #main>
      <h1 class="uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]" @bounceIn>Mannan</h1>
      <hr class="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" @fadeIn>
      <p class="m-0 mt-[60px] leading-[1.6] text-white" @slideInLeft>
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
      <button (click)="goToAbout()" class="uppercase py-2 px-[25px] mt-[25px] transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] relative overflow-hidden border-2 border-[#039be5] bg-transparent text-white shadow-[0_4px_15px_0_rgba(3,155,229,0.2)] hover:scale-[1.08] hover:-translate-y-0.5 hover:cursor-pointer hover:shadow-[0_8px_25px_0_rgba(3,155,229,0.4)] hover:border-[#4fc3f7] active:scale-[1.02] active:translate-y-0 active:shadow-[0_4px_15px_0_rgba(3,155,229,0.3)] before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:w-0 before:h-0 before:rounded-full before:bg-[rgba(3,155,229,0.3)] before:-translate-x-1/2 before:-translate-y-1/2 before:transition-[width,height] before:duration-[600ms] hover:before:w-[300px] hover:before:h-[300px]" @fadeIn>About me</button>
    </div>
  `,
  styles: []
})
export class Home extends BaseSection {
  protected sectionLink = Links.home;
  Links = Links;

  goToAbout(): void {
    navigateTo(this.store, Links.about);
  }
}
