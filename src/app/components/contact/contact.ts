import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { NavigationService } from '../../services/navigation.service';
import { scaleIn, fadeIn, slideInLeft } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section.component';

@Component({
  selector: 'contact',
  standalone: true,
  imports: [CommonModule],
  animations: [scaleIn, fadeIn, slideInLeft],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>Contact</h1>
      <hr @fadeIn>
      <div class="flex-column margin-top-60" @slideInLeft>
        <a href="mailto:hello@mannan.is">hello&#64;mannan.is</a>
        <a href="tel:15712288302" class="margin-top-12 margin-bottom-12">+1 (571) 228-8302</a>
        <p class="margin-0">Alexandria, Virginia</p>
      </div>
      <button (click)="navService.goTo(navService.Links.home)" class="margin-top-50" @fadeIn>Back To Home</button>
    </div>
  `,
  styles: []
})
export class ContactComponent extends BaseSectionComponent {
  protected sectionLink = Links.contact;
  protected observerThreshold = 0.99;

  constructor(navService: NavigationService) {
    super(navService);
  }
}
