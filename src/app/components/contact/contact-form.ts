import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleLogoIcon } from '../icons/google-logo-icon';

@Component({
  selector: 'contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleLogoIcon],
  template: `
    <div class="header-text">
      <h2 class="main-heading">Ready to collaborate?</h2>
      <p class="sub-heading">Let's create something exceptional.</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <button type="button" class="btn-google" disabled>
        <google-logo-icon />
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
  `,
  styles: [`
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
  `]
})
export class ContactForm {
  @Output() submitForm = new EventEmitter<string>();

  userInput = '';
  isLoading = false;
  showTooltip = false;
  readonly placeholder: string = 'Please share your name, email, or reason for reaching out'

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

    this.isLoading = true;
    this.submitForm.emit(this.userInput);
  }

  reset() {
    this.userInput = '';
    this.isLoading = false;
    this.showTooltip = false;
  }
}
