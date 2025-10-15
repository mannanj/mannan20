import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleLogoIcon } from '../icons/google-logo-icon';

@Component({
  selector: 'contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleLogoIcon],
  template: `
    <div class="text-center mb-8">
      <h2 class="m-0 mb-2 text-[2rem] font-normal text-white tracking-tight">Ready to collaborate?</h2>
      <p class="m-0 text-lg text-[#999] font-light">Let's create something exceptional.</p>
    </div>

    <form (ngSubmit)="onSubmit()">
      <button type="button" class="w-full py-3.5 px-6 rounded-lg text-base font-medium cursor-pointer transition-all duration-200 !border !border-[#404040] bg-transparent text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-[#2a2a2a] enabled:hover:border-[#555] focus:outline-none focus:border-[#555] !shadow-none !normal-case !mt-0" disabled>
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
        class="w-full py-3.5 px-4 border border-[#404040] rounded-lg text-base text-white bg-[#2a2a2a] transition-all duration-200 box-border resize-y font-[inherit] leading-normal placeholder:text-[#666] focus:outline-none focus:border-[#555] focus:bg-[#333] disabled:opacity-60 disabled:cursor-not-allowed"
        [placeholder]="placeholder"
        [disabled]="isLoading"></textarea>

      <div class="mt-5 relative">
        <button
          type="submit"
          class="w-full py-3.5 px-6 rounded-lg text-base font-medium cursor-pointer transition-all duration-200 !border-2 !border-[#039be5] bg-[#f0ede6] text-[#1a1a1a] hover:bg-[#e5e0d8] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed !shadow-none !normal-case !mt-0 focus:outline-none"
          (mouseenter)="showTooltip = true"
          (mouseleave)="showTooltip = false">
          {{ isLoading ? 'Sending...' : 'Continue your request' }}
        </button>
        <div class="tooltip" *ngIf="showTooltip && !isValid()">
          Enter a name, email or reason
        </div>
      </div>

      <p class="m-0 mt-4 p-0 text-[0.8125rem] leading-normal text-[#666] font-light flex items-center justify-center gap-2">
        <span>I will never reach out to you without your consent.</span>
      </p>
    </form>
  `,
  styles: [`
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
