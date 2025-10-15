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
      <h1 @bounceIn>Mannan</h1>
      <hr @fadeIn>
      <p class="margin-0 margin-top-60" @slideInLeft>
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
      <button (click)="goToAbout()" class="margin-top-60" @fadeIn>About me</button>
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
