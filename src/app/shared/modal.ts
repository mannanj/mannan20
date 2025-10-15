import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactResult } from '../models/models';

@Component({
  selector: 'modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] p-5" (click)="closeModal()">
      <div class="bg-[#1a1a1a] border border-[#333] rounded-2xl max-w-[520px] w-full p-10 relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]" (click)="$event.stopPropagation()">
        <button class="absolute top-4 right-4 bg-transparent border-0 text-2xl cursor-pointer text-[#888] leading-none p-0 w-8 h-8 flex items-center justify-center transition-colors duration-200 hover:text-white" (click)="closeModal()">&times;</button>
        <div class="mt-2">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class Modal {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
