import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getPhoneLink, copyToClipboard } from '../utils/help';

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
          <ng-content select="[modal-form]"></ng-content>
        </div>

        <div *ngIf="showResult && result" class="result-view">
          <ng-content select="[modal-result]"></ng-content>
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
  @Input() showResult = false;
  @Input() result: ContactResult | null = null;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
