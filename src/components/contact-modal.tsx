'use client';

import { useApp } from '@/context/app-context';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import { DraggablePopout } from './draggable-popout';
import type { ContactResultData } from '@/lib/types';

export const CONTACT_DATA: ContactResultData = {
  email: 'hello@mannan.is',
  phone: '+1 (571) 228-8302',
};

export function ContactModal() {
  const { state, closeContactModal, setContactResult } = useApp();

  const showResult = state.contactRevealed || state.contactShowResult;

  return (
    <DraggablePopout
      isOpen={state.contactModalOpen}
      onClose={closeContactModal}
      anchor={state.contactPopoutPosition}
      testId="contact-modal"
      backdropTestId="contact-modal-backdrop"
      closeTestId="contact-modal-close"
    >
      {!showResult ? (
        <ContactForm onReveal={() => setContactResult(CONTACT_DATA)} />
      ) : (
        <ContactResult result={state.contactResult ?? CONTACT_DATA} />
      )}
    </DraggablePopout>
  );
}
