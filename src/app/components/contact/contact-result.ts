import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactResult as ContactResultData } from '../../models/models';
import * as help from '../../utils/help';
import { CopyIcon } from '../icons/copy-icon';
import { CheckIcon } from '../icons/check-icon';

const COPY_FEEDBACK_DURATION_MS = 2000;

@Component({
  selector: 'contact-result',
  standalone: true,
  imports: [CommonModule, CopyIcon, CheckIcon],
  template: `
    <h3 class="m-0 mb-6 text-xl text-white text-center">Say Hi <span aria-label="wave" title="Wave">👋</span></h3>
    <div class="bg-[#2a2a2a] border border-[#404040] p-5 rounded-lg mb-5">
      <div class="mb-3 last:mb-0 text-[0.95rem] text-white flex items-center gap-3" *ngIf="result">
        <strong class="inline-block w-[70px] text-[#999] shrink-0">Email:</strong>
        <a class="text-white no-underline hover:underline flex-1" [href]="'mailto:' + result.email">{{ result.email }}</a>
        <button class="bg-transparent border border-[#404040] rounded-md p-1.5 cursor-pointer text-[#999] transition-all duration-200 flex items-center justify-center shrink-0 hover:bg-[#2a2a2a] hover:text-white hover:border-[#555]" (click)="copyEmail()" [title]="copiedEmail ? 'Copied!' : 'Copy'">
          <copy-icon class="w-4 h-4" *ngIf="!copiedEmail" />
          <check-icon class="w-4 h-4" *ngIf="copiedEmail" />
        </button>
      </div>
      <div class="mb-3 last:mb-0 text-[0.95rem] text-white flex items-center gap-3" *ngIf="result">
        <strong class="inline-block w-[70px] text-[#999] shrink-0">Phone:</strong>
        <a class="text-white no-underline hover:underline flex-1" [href]="help.getPhoneLink(result.phone)">{{ result.phone }}</a>
        <button class="bg-transparent border border-[#404040] rounded-md p-1.5 cursor-pointer text-[#999] transition-all duration-200 flex items-center justify-center shrink-0 hover:bg-[#2a2a2a] hover:text-white hover:border-[#555]" (click)="copyPhone()" [title]="copiedPhone ? 'Copied!' : 'Copy'">
          <copy-icon class="w-4 h-4" *ngIf="!copiedPhone" />
          <check-icon class="w-4 h-4" *ngIf="copiedPhone" />
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class ContactResult {
  @Input() result: ContactResultData | null = null;

  copiedEmail = false;
  copiedPhone = false;
  help = help;

  copyEmail() {
    if (this.result) {
      help.copyToClipboard(this.result.email);
      this.copiedEmail = true;
      setTimeout(() => this.copiedEmail = false, COPY_FEEDBACK_DURATION_MS);
    }
  }

  copyPhone() {
    if (this.result) {
      help.copyToClipboard(this.result.phone);
      this.copiedPhone = true;
      setTimeout(() => this.copiedPhone = false, COPY_FEEDBACK_DURATION_MS);
    }
  }

  reset() {
    this.copiedEmail = false;
    this.copiedPhone = false;
  }
}
