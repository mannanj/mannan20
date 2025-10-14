import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactResult } from '../../models/models';
import * as help from '../../utils/help';

@Component({
  selector: 'contact-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3>Say Hi <span aria-label="wave" title="Wave">👋</span></h3>
    <div class="contact-result">
      <div class="contact-item" *ngIf="result">
        <strong>Email:</strong>
        <a [href]="'mailto:' + result.email">{{ result.email }}</a>
        <button class="copy-btn" (click)="copyEmail()" [title]="copiedEmail ? 'Copied!' : 'Copy'">
          <svg *ngIf="!copiedEmail" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg *ngIf="copiedEmail" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
      <div class="contact-item" *ngIf="result">
        <strong>Phone:</strong>
        <a [href]="help.getPhoneLink(result.phone)">{{ result.phone }}</a>
        <button class="copy-btn" (click)="copyPhone()" [title]="copiedPhone ? 'Copied!' : 'Copy'">
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
  `,
  styles: [`
    h3 {
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
  `]
})
export class ContactResultComponent {
  @Input() result: ContactResult | null = null;

  copiedEmail = false;
  copiedPhone = false;
  help = help;

  copyEmail() {
    if (this.result) {
      help.copyToClipboard(this.result.email);
      this.copiedEmail = true;
      setTimeout(() => this.copiedEmail = false, 2000);
    }
  }

  copyPhone() {
    if (this.result) {
      help.copyToClipboard(this.result.phone);
      this.copiedPhone = true;
      setTimeout(() => this.copiedPhone = false, 2000);
    }
  }

  reset() {
    this.copiedEmail = false;
    this.copiedPhone = false;
  }
}
