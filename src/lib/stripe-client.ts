import Stripe from 'stripe';

export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error('Stripe is not configured');
  return new Stripe(apiKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
