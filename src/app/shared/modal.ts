import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getPhoneLink } from '../utils/help';

export interface ContactResult {
  email: string;
  phone: string;
}

@Component({
  selector: 'modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="modal-backdrop" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="closeModal()">&times;</button>

        <div *ngIf="!showResult" class="modal-body">
          <div class="header-text">
            <h2 class="main-heading">Ready to collaborate?</h2>
            <p class="sub-heading">Let's create something exceptional.</p>
          </div>

          <form (ngSubmit)="onSubmit()">
            <button type="button" class="btn-google" disabled>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            <div class="divider">
              <span>OR</span>
            </div>

            <textarea
              [(ngModel)]="userInput"
              name="userInput"
              rows="4"
              class="form-input"
              [placeholder]="placeholder"
              [disabled]="isLoading"></textarea>

            <div class="button-wrapper">
              <button
                type="submit"
                class="btn-primary"
                (mouseenter)="showTooltip = true"
                (mouseleave)="showTooltip = false">
                {{ isLoading ? 'Sending...' : 'Continue your request' }}
              </button>
              <div class="tooltip" *ngIf="showTooltip && !isValid()">
                Enter a name, email or reason
              </div>
            </div>

            <p class="privacy-text">
              I will never reach out to you without your consent.
            </p>
          </form>
        </div>

        <div *ngIf="showResult && result" class="result-view">
          <h3>Say Hi <span aria-label="wave" title="Wave">👋</span></h3>
          <div class="contact-result">
            <div class="contact-item">
              <strong>Email:</strong>
              <a [href]="'mailto:' + result.email">{{ result.email }}</a>
              <button class="copy-btn" (click)="copyToClipboard(result.email)" [title]="copiedEmail ? 'Copied!' : 'Copy'">
                <svg *ngIf="!copiedEmail" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg *ngIf="copiedEmail" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
            <div class="contact-item">
              <strong>Phone:</strong>
              <a [href]="formatPhoneLink(result.phone)">{{ result.phone }}</a>
              <button class="copy-btn" (click)="copyToClipboard(result.phone)" [title]="copiedPhone ? 'Copied!' : 'Copy'">
                <svg *ngIf="!copiedPhone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg *ngIf="copiedPhone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.75);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      max-width: 520px;
      width: 100%;
      padding: 40px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #888;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #fff;
    }

    .modal-body {
      margin-top: 8px;
    }

    .header-text {
      text-align: center;
      margin-bottom: 32px;
    }

    .main-heading {
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 400;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .sub-heading {
      margin: 0;
      font-size: 1.125rem;
      color: #999;
      font-weight: 300;
    }

    .btn-google {
      width: 100%;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #404040;
      background: transparent;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .btn-google:not(:disabled):hover {
      background: #2a2a2a;
      border-color: #555;
    }

    .btn-google:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-google svg {
      flex-shrink: 0;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 24px 0;
      color: #666;
      font-size: 0.875rem;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #404040;
    }

    .divider span {
      padding: 0 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #404040;
      border-radius: 8px;
      font-size: 1rem;
      color: #fff;
      background: #2a2a2a;
      transition: all 0.2s;
      box-sizing: border-box;
      resize: vertical;
      font-family: inherit;
      line-height: 1.5;
    }

    .form-input::placeholder {
      color: #666;
    }

    .form-input:focus {
      outline: none;
      border-color: #555;
      background: #333;
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .button-wrapper {
      margin-top: 20px;
      position: relative;
    }

    .btn-primary {
      width: 100%;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      background-color: #f0ede6;
      color: #1a1a1a;
    }

    .btn-primary:hover {
      background-color: #e5e0d8;
    }

    .btn-primary:active {
      transform: scale(0.98);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #333;
      color: #fff;
      border-radius: 6px;
      font-size: 0.875rem;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: #333;
    }

    .privacy-text {
      margin: 16px 0 0 0;
      padding: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: #888;
      text-align: center;
    }

    .result-view {
      padding: 20px 0;
    }

    .result-view h3 {
      margin: 0 0 24px 0;
      font-size: 1.25rem;
      color: #fff;
      text-align: center;
    }

    .contact-result {
      background-color: #2a2a2a;
      border: 1px solid #404040;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .contact-item {
      margin-bottom: 12px;
      font-size: 0.95rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .contact-item:last-child {
      margin-bottom: 0;
    }

    .contact-item strong {
      display: inline-block;
      width: 70px;
      color: #999;
      flex-shrink: 0;
    }

    .contact-item a {
      color: #fff;
      text-decoration: none;
      flex: 1;
    }

    .contact-item a:hover {
      text-decoration: underline;
    }

    .copy-btn {
      background: none;
      border: 1px solid #404040;
      border-radius: 6px;
      padding: 6px;
      cursor: pointer;
      color: #999;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .copy-btn:hover {
      background: #2a2a2a;
      color: #fff;
      border-color: #555;
    }

    .copy-btn svg {
      width: 16px;
      height: 16px;
    }

    .btn-secondary {
      width: 100%;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #404040;
      background-color: transparent;
      color: #fff;
    }

    .btn-secondary:hover {
      background-color: #2a2a2a;
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  userInput = '';
  showResult = false;
  isLoading = false;
  showTooltip = false;
  result: ContactResult | null = null;
  copiedEmail = false;
  copiedPhone = false;

  private placeholders = [
    'Please share your name, email, or reason for reaching out',
    `Hi my name is John Doe and I want to chat about an AI business opportunity.

My email is john.doe@aiop.com`
  ];
  placeholder: string;

  constructor() {
    this.placeholder = this.placeholders[Math.floor(Math.random() * this.placeholders.length)];
  }

  isValid(): boolean {
    const trimmed = this.userInput.trim();
    if (trimmed.includes('@')) {
      return true;
    }
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    return words.length >= 2;
  }

  onSubmit() {
    if (!this.isValid()) {
      return;
    }

    console.log('Contact request submitted:', this.userInput);

    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;
      this.showResult = true;
      this.result = {
        email: 'hello@mannan.is',
        phone: '+1 (571) 228-8302'
      };
    }, 2000);
  }

  closeModal() {
    this.showResult = false;
    this.isLoading = false;
    this.result = null;
    this.copiedEmail = false;
    this.copiedPhone = false;
    this.close.emit();
  }

  formatPhoneLink(phone: string): string {
    return getPhoneLink(phone);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      if (text.includes('@')) {
        this.copiedEmail = true;
        setTimeout(() => this.copiedEmail = false, 2000);
      } else {
        this.copiedPhone = true;
        setTimeout(() => this.copiedPhone = false, 2000);
      }
    });
  }
}
