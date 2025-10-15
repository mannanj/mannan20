import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleLogoIcon } from '../icons/google-logo-icon';

@Component({
  selector: 'contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleLogoIcon],
  template: `
    <div class="text-center mb-3">
      <h2 class="m-0 mb-2 text-[3rem] !font-light text-white tracking-tight !mt-0">Ready to collaborate?</h2>
      <p class="m-0 text-lg !text-white !font-light">Let's create something exceptional.</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <div class="action-container">
        <button type="button" class="w-full py-3 px-6 rounded-lg text-[0.9375rem] font-medium cursor-pointer transition-all duration-200 !border !border-[#404040] bg-transparent text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-[#2a2a2a] enabled:hover:border-[#555] focus:outline-none focus:border-[#555] !shadow-none !normal-case !mt-0" disabled>
          <google-logo-icon class="shrink-0" />
          Continue with Google
        </button>

        <div class="divider">
          <span>OR</span>
        </div>

        <textarea
          [(ngModel)]="userInput"
          name="userInput"
          rows="4"
          class="w-full py-3 px-4 border border-[#404040] rounded-lg text-[0.9375rem] text-white bg-[#2a2a2a] transition-all duration-200 box-border resize-y font-[inherit] leading-normal placeholder:text-[#666] focus:outline-none focus:border-[#555] focus:bg-[#333] disabled:opacity-60 disabled:cursor-not-allowed"
          [placeholder]="placeholder"
          [disabled]="isLoading"
          (blur)="validateInput()"></textarea>

        <div *ngIf="emailError" class="text-red-500 text-sm mt-2 ml-1">
          {{ emailError }}
        </div>

        <div class="mt-4 relative">
          <button
            type="submit"
            class="w-full py-3 px-6 rounded-lg text-[0.9375rem] font-medium cursor-pointer transition-all duration-200 !border !border-transparent hover:!border-[#039be5] !bg-white !text-black hover:!bg-[#f5f5f5] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed !shadow-none !normal-case !mt-0 focus:outline-none focus:!border-[#039be5]"
            (mouseenter)="showTooltip = true"
            (mouseleave)="showTooltip = false">
            {{ isLoading ? 'Sending...' : 'Continue your request' }}
          </button>
          <div class="tooltip" *ngIf="showTooltip && !isValid()">
            Enter a name, email or reason
          </div>
        </div>

        <p class="m-0 mt-5 p-0 !text-[0.6875rem] leading-normal !text-[#555] !font-light flex items-center justify-center gap-2">
          <span>I will never reach out without your consent.</span>
        </p>
      </div>
    </form>
  `,
  styles: [`
    .action-container {
      padding: 20px;
      border: 1px solid #404040;
      border-radius: 16px;
    }

    .divider {
      text-align: center;
      margin: 14px 0;
      color: #666;
      font-size: 0.6875rem;
    }

    .divider span {
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
  `]
})
export class ContactForm {
  @Output() submitForm = new EventEmitter<string>();

  userInput = '';
  isLoading = false;
  showTooltip = false;
  emailError = '';
  readonly placeholder: string = 'Enter your name, email, or reason for reaching out'

  private readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email.trim());
  }

  hasEmailInInput(): boolean {
    return this.userInput.trim().includes('@');
  }

  validateInput(): void {
    const trimmed = this.userInput.trim();

    if (this.hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch) {
        const email = emailMatch[0];
        if (!this.isValidEmail(email)) {
          this.emailError = 'Please enter a valid email address';
          return;
        }
      }
    }

    this.emailError = '';
  }

  isValid(): boolean {
    const trimmed = this.userInput.trim();

    if (this.hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch) {
        const email = emailMatch[0];
        return this.isValidEmail(email);
      }
      return false;
    }

    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    return words.length >= 2;
  }

  onSubmit() {
    this.validateInput();

    if (!this.isValid() || this.emailError) {
      return;
    }

    this.isLoading = true;
    this.submitForm.emit(this.userInput);
  }

  reset() {
    this.userInput = '';
    this.isLoading = false;
    this.showTooltip = false;
    this.emailError = '';
  }
}
