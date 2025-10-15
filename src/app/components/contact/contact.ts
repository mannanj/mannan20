import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Links, ContactResult as ContactResultData } from '../../models/models';
import { scaleIn, fadeIn, slideInLeft } from '../../animations/animations';
import { BaseSection } from '../../shared/base-section';
import { Modal } from '../../shared/modal';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import { navigateTo } from '../../utils/help';

const FORM_SUBMIT_DELAY_MS = 2000;

@Component({
  selector: 'contact',
  standalone: true,
  imports: [CommonModule, Modal, ContactForm, ContactResult],
  animations: [scaleIn, fadeIn, slideInLeft],
  template: `
    <div #main class="pb-[100px]">
      <h1 class="text-end" @scaleIn>Contact</h1>
      <hr @fadeIn>
      <div class="flex flex-col margin-top-25" @slideInLeft>
        <div class="contact-grid">
          <div class="flex flex-col">
            <a class="text-base tracking-wide text-[#039be5] no-underline cursor-pointer hover:text-[#0277bd]" (click)="openModal()" title="Request contact info">*****&#64;mannan.is</a>
            <a class="text-base tracking-wide text-[#039be5] no-underline cursor-pointer margin-top-8 hover:text-[#0277bd]" (click)="openModal()" title="Request contact info">+1 (***) *** 8302</a>
          </div>
          <div class="ripple-container" (click)="openModal()" title="Request contact info">
            <div class="circle"></div>
          </div>
        </div>
        <p class="margin-0 margin-top-12">Alexandria, Virginia</p>
      </div>
      <button (click)="goToHome()" class="margin-top-50" @fadeIn>Back to Top</button>
    </div>

    <modal [isOpen]="isModalOpen" (close)="closeModal()">
      <contact-form *ngIf="!showResult" (submitForm)="onFormSubmit($event)"></contact-form>
      <contact-result *ngIf="showResult" [result]="result"></contact-result>
    </modal>
  `,
  styles: [`
    .contact-grid {
      display: grid;
      grid-template-columns: 2fr auto;
      align-items: center;
      gap: 24px;
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
export class Contact extends BaseSection {
  protected sectionLink = Links.contact;
  @ViewChild(ContactForm) contactForm?: ContactForm;
  @ViewChild(ContactResult) contactResult?: ContactResult;

  isModalOpen = false;
  showResult = false;
  result: ContactResultData | null = null;

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.showResult = false;
    this.result = null;
    this.contactForm?.reset();
    this.contactResult?.reset();
  }

  onFormSubmit(userInput: string) {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      this.showResult = true;
      this.result = {
        email: 'hello@mannan.is',
        phone: '+1 (571) 228-8302'
      };
    }, FORM_SUBMIT_DELAY_MS);
  }

  goToHome(): void {
    navigateTo(this.store, Links.home);
  }
}
