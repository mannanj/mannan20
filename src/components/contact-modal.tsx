'use client';

import { useApp } from '@/context/app-context';
import { Modal } from './modal';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const FORM_SUBMIT_DELAY_MS = 2000;

const CONTACT_DATA: ContactResultData = {
  email: 'hello@mannan.is',
  phone: '+1 (571) 228-8302',
};

export function ContactModal() {
  const { state, closeContactModal, setContactResult } = useApp();

  const handleFormSubmit = (userInput: string) => {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      setContactResult(CONTACT_DATA);
    }, FORM_SUBMIT_DELAY_MS);
  };

  const showResult = state.contactRevealed || state.contactShowResult;

  return (
    <Modal isOpen={state.contactModalOpen} onClose={closeContactModal}>
      {!showResult ? (
        <ContactForm onSubmit={handleFormSubmit} />
      ) : (
        <ContactResult result={state.contactResult ?? CONTACT_DATA} />
      )}
    </Modal>
  );
}
