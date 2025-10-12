import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';
import { Links } from '../../models/models';
import { bounceIn, fadeIn, slideInLeft } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section.component';

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
      <button (click)="navService.goTo(navService.Links.about)" class="margin-top-60" @fadeIn>About me</button>
    </div>
  `,
  styles: []
})
export class HomeComponent extends BaseSectionComponent {
  protected sectionLink = Links.home;
  protected observerThreshold = 0.99;

  constructor(navService: NavigationService) {
    super(navService);
  }
}
