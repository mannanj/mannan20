import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactResult } from '../models/models';

@Component({
  selector: 'modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="modal-backdrop" (click)="closeModal()">
      <div class="modal-content" [class.modal-content-large]="widthStyle === 'large'" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="closeModal()">&times;</button>
        <div class="modal-body">
          <ng-content></ng-content>
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

    .modal-content-large {
      max-width: 768px;
      width: 95vw;
    }

    @media (min-width: 768px) {
      .modal-content-large {
        width: 90vw;
      }
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
  `]
})
export class Modal {
  @Input() isOpen = false;
  @Input() widthStyle: 'default' | 'large' = 'default';
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
