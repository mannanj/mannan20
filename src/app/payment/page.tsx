import type { Metadata } from 'next';
import Stripe from 'stripe';
import { Payment } from '@/components/payment';

export const metadata: Metadata = {
  title: 'Payment - Mannan Javid',
};

interface PaymentDetails {
  amount: string;
  email: string | null;
  date: string;
}

async function getPaymentDetails(sessionId: string): Promise<PaymentDetails | null> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
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
