import type { Metadata } from 'next';
import { Payment } from '@/components/payment';
import { getStripeClient } from '@/lib/stripe-client';

export const metadata: Metadata = {
  title: 'Payment',
};

interface PaymentDetails {
  amount: string;
  email: string | null;
  date: string;
}

async function getPaymentDetails(sessionId: string): Promise<PaymentDetails | null> {
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    return {
      amount: (session.amount_total! / 100).toFixed(2),
      email: session.customer_details?.email ?? null,
      date: new Date(session.created * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  } catch {
    return null;
  }
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
  const { status, session_id } = await searchParams;
  const details = status === 'success' && session_id
    ? await getPaymentDetails(session_id)
    : null;
  return <Payment status={status ?? null} details={details} />;
}
