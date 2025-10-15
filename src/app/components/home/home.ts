import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { BaseSection } from '../../shared/base-section';
import { navigateTo } from '../../utils/help';

@Component({
  selector: 'home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #main>
      <h1 class="uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">Mannan</h1>
      <hr class="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5">
      <p class="m-0 leading-[1.6] text-white">
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
      <button (click)="goToAbout()" class="nav-button mt-[25px]">About me</button>
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
