'use client';

import { TurnstileCheck } from './turnstile-check';

interface ContactFormProps {
  onReveal: () => void;
}

export function ContactForm({ onReveal }: ContactFormProps) {
  return <TurnstileCheck onPass={onReveal} testIdPrefix="contact" />;
}
