'use client';

import { useApp } from '@/context/app-context';
import { Modal } from './modal';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const FORM_SUBMIT_DELAY_MS = 2000;

export function ContactModal() {
  const { state, closeContactModal, setContactResult } = useApp();

  const handleFormSubmit = (userInput: string) => {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      const result: ContactResultData = {
        email: 'hello@mannan.is',
        phone: '+1 (571) 228-8302',
      };
      setContactResult(result);
    }, FORM_SUBMIT_DELAY_MS);
  };

  return (
    <Modal isOpen={state.contactModalOpen} onClose={closeContactModal}>
      {!state.contactShowResult ? (
        <ContactForm onSubmit={handleFormSubmit} />
      ) : state.contactResult ? (
        <ContactResult result={state.contactResult} />
      ) : null}
    </Modal>
  );
}
