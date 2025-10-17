import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Modal } from '../../shared/modal';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import { selectContactModalOpen, selectContactShowResult, selectContactResult } from '../../store/app.selectors';
import { closeContactModal, setContactResult } from '../../store/app.actions';
import { ContactResult as ContactResultData } from '../../models/models';

const FORM_SUBMIT_DELAY_MS = 2000;

@Component({
  selector: 'contact-modal',
  imports: [CommonModule, Modal, ContactForm, ContactResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <modal [isOpen]="modalOpen()" (close)="closeModal()">
      <contact-form *ngIf="!showResult()" (submitForm)="onFormSubmit($event)"></contact-form>
      <contact-result *ngIf="showResult()" [result]="result()"></contact-result>
    </modal>
  `
})
export class ContactModal {
  private store = inject(Store);

  protected modalOpen = toSignal(this.store.select(selectContactModalOpen), { initialValue: false });
  protected showResult = toSignal(this.store.select(selectContactShowResult), { initialValue: false });
  protected result = toSignal(this.store.select(selectContactResult), { initialValue: null });

  closeModal() {
    this.store.dispatch(closeContactModal());
  }

  onFormSubmit(userInput: string) {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      const result: ContactResultData = {
        email: 'hello@mannan.is',
        phone: '+1 (571) 228-8302'
      };
      this.store.dispatch(setContactResult({ result }));
    }, FORM_SUBMIT_DELAY_MS);
  }
}
