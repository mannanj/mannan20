import { afterEach, describe, expect, test } from 'bun:test';
import { getStripeClient } from './stripe-client';

const originalStripeKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalStripeKey;
});

describe('Stripe Worker transport contract', () => {
  test('pins the fetch client instead of relying on platform auto-detection', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_transport_only';
    const stripe = getStripeClient() as ReturnType<typeof getStripeClient> & {
      getApiField(name: 'httpClient'): { getClientName(): string };
    };

    expect(stripe.getApiField('httpClient').getClientName()).toBe('fetch');
  });

  test('fails deterministically when the Worker secret is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;

    expect(() => getStripeClient()).toThrow('Stripe is not configured');
  });

  test('keeps both Stripe call sites on the shared Worker client', async () => {
    const checkoutSource = await Bun.file(
      new URL('../app/api/checkout/route.ts', import.meta.url),
    ).text();
    const paymentSource = await Bun.file(
      new URL('../app/payment/page.tsx', import.meta.url),
    ).text();
    expect(checkoutSource).toContain("from '@/lib/stripe-client'");
    expect(paymentSource).toContain("from '@/lib/stripe-client'");
    expect(checkoutSource).not.toContain("from 'stripe'");
    expect(paymentSource).not.toContain("from 'stripe'");
  });
});
