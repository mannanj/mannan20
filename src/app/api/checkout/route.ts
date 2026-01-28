import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const MIN_AMOUNT_CENTS = 100;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json();
    const cents = Math.round(Number(amount) * 100);

    if (!cents || cents < MIN_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: 'Amount must be at least $1' },
        { status: 400 }
      );
    }

    const proto = request.headers.get('x-forwarded-proto') ?? 'http';
    const host = request.headers.get('host') ?? 'localhost:3000';
    const origin = `${proto}://${host}`;

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Payment to Mannan' },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment?status=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
