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
      <div class="contact-container margin-top-25" @slideInLeft>
        <div class="contact-grid">
          <div class="contact-info">
            <a class="contact-link" (click)="openModal()" title="Request contact info">*****&#64;mannan.is</a>
            <a class="contact-link margin-top-8" (click)="openModal()" title="Request contact info">+1 (***) *** 8302</a>
          </div>
          <div class="ripple-container" (click)="openModal()" title="Request contact info">
            <div class="circle"></div>
          </div>
        </div>
        <p class="margin-0 margin-top-12">Alexandria, Virginia</p>
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
      grid-template-columns: 2fr auto;
      align-items: center;
      gap: 24px;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
    }

    .contact-link {
      font-size: 1rem;
      letter-spacing: 0.5px;
      color: #039be5;
      text-decoration: none;
      cursor: pointer;
    }

    .contact-link:hover {
      color: #0277bd;
    }

    .ripple-container {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      justify-self: center;
      align-self: center;
      position: relative;
      width: 90px;
      height: 90px;
      margin-top: 20px;
    }

    .circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 1);
      position: relative;
      transition: all 0.3s ease;
    }

    .circle::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 200%;
      height: 200%;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 0.75);
      transform: translate(-50%, -50%);
      transition: all 0.3s ease;
    }

    .circle::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 300%;
      height: 300%;
      border-radius: 50%;
      border: 2px solid rgba(77, 184, 255, 0.45);
      transform: translate(-50%, -50%);
      transition: all 0.3s ease;
    }

    .ripple-container:hover .circle {
      border-color: rgba(3, 155, 229, 1);
    }

    .ripple-container:hover .circle::before {
      border-color: rgba(3, 155, 229, 0.9);
      animation: pulse 1.5s ease-out infinite;
    }

    .ripple-container:hover .circle::after {
      border-color: rgba(3, 155, 229, 0.6);
      animation: pulse 1.5s ease-out infinite 0.3s;
    }

    @keyframes pulse {
      0% {
        opacity: 0.8;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.3);
      }
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
