import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links } from '../../models/models';
import { NavigationService } from '../../services/navigation.service';
import { scaleIn, fadeIn, slideInLeft } from '../../animations/animations';
import { BaseSectionComponent } from '../../shared/base-section.component';
import { ModalComponent } from '../../shared/modal';

@Component({
  selector: 'contact',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  animations: [scaleIn, fadeIn, slideInLeft],
  template: `
    <div #main>
      <h1 class="text-end" @scaleIn>Contact</h1>
      <hr @fadeIn>
      <div class="contact-container margin-top-60" @slideInLeft>
        <div class="contact-grid">
          <div class="contact-info">
            <div class="contact-value">*****&#64;mannan.is</div>
            <div class="contact-value margin-top-12">+1 (***) *** 8302</div>
          </div>
          <button class="say-hello-btn" (click)="openModal()" title="Request contact info">
            <span class="say-hello-text">Say<br>Hi</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
          <div class="emoji-container">
            <span class="smiley-emoji">😊</span>
          </div>
        </div>
        <p class="margin-0 margin-top-24">Alexandria, Virginia</p>
      </div>
      <button (click)="navService.goTo(navService.Links.home)" class="margin-top-50" @fadeIn>Back to Top</button>
    </div>

    <modal
      [isOpen]="isModalOpen"
      (close)="closeModal()">
    </modal>
  `,
  styles: [`
    .contact-container {
      display: flex;
      flex-direction: column;
    }

    .contact-grid {
      display: grid;
      grid-template-columns: 2.4fr 1.3fr 1fr;
      align-items: center;
      gap: 42px;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
    }

    .contact-value {
      font-size: 1rem;
      letter-spacing: 0.5px;
    }

    .say-hello-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0.7;
      font-size: 1.25rem;
      line-height: 1.2;
      justify-self: center;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .say-hello-btn:hover {
      opacity: 1;
      transform: translateY(-2px);
    }

    .say-hello-text {
      display: inline-block;
      text-transform: none;
    }

    .say-hello-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .emoji-container {
      display: flex;
      justify-content: flex-start;
    }

    .smiley-emoji {
      font-size: 2rem;
    }
  `]
})
export class ContactComponent extends BaseSectionComponent {
  protected sectionLink = Links.contact;
  protected observerThreshold = 0.99;

  isModalOpen = false;

  constructor(navService: NavigationService) {
    super(navService);
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }
}
