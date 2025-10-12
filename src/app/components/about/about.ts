import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { NavigationService } from '../../services/navigation.service';
import { fadeIn, slideInRight, scaleIn } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section.component';

@Component({
  selector: 'about',
  standalone: true,
  imports: [CommonModule],
  animations: [fadeIn, slideInRight, scaleIn],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>About</h1>
      <hr @fadeIn>
      <p class="margin-0 margin-top-60" @slideInRight style="animation-delay: 0.2s">
        I am a multi-disciplinary engineer, leader, and student. I'm passionate about success through effective practice, strong communication, and asymmetric risk taking.
      </p><br>
      <p @slideInRight style="animation-delay: 0.4s">
        I grew through a career of tight teams in fast-paced initiatives. I've had experience building unique products in a range of environments, from non-profits to government and commercial.
      </p><br>
      <p @slideInRight style="animation-delay: 0.6s">
        I measure my success by the strength of those around me. My greatest passion is to distill the simple from the complex, and to find flow and trust within my teams.
      </p>
      <button (click)="navService.goTo(navService.Links.resume)" class="margin-top-60" @fadeIn style="animation-delay: 0.8s">View My Resume</button>
    </div>
  `,
  styles: []
})
export class AboutComponent extends BaseSectionComponent {
  protected sectionLink = Links.about;
  protected observerThreshold = 0.66;

  constructor(navService: NavigationService) {
    super(navService);
  }
}
