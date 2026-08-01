import { NextResponse } from 'next/server';
import { buildContactRequestEmail, normalizeContactRequest } from '@/lib/contact-request';
import { sendEmail, type SendEmailInput, type SendEmailResult } from '@/lib/email';
import { limitContactRequest, type LimitResult } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile-verification';

export const dynamic = 'force-dynamic';

const CALLBACK_SUBJECT = 'Portfolio callback request';
const PUBLIC_CONTACT_FALLBACK = 'hello@mannan.is';

export interface ContactRequestDependencies {
  verifyToken: (token: string) => Promise<boolean>;
  limit: (ip: string) => Promise<LimitResult>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  resendApiKey?: string;
  recipient?: string;
}

type ContactRequestBoundaries = Pick<
  ContactRequestDependencies,
  'verifyToken' | 'limit' | 'send'
>;

export interface ContactRequestEnvironment {
  RESEND_API_KEY?: string;
  CONTACT_REQUEST_TO?: string;
}

/** Builds the server-only dependency set used by POST. */
export function createContactRequestDependencies(
  environment: ContactRequestEnvironment = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_REQUEST_TO: process.env.CONTACT_REQUEST_TO,
  },
  boundaries: ContactRequestBoundaries = {
    verifyToken: verifyTurnstileToken,
    limit: limitContactRequest,
    send: sendEmail,
  },
): ContactRequestDependencies {
  return {
    ...boundaries,
    resendApiKey: environment.RESEND_API_KEY,
    recipient: environment.CONTACT_REQUEST_TO?.trim() || PUBLIC_CONTACT_FALLBACK,
  };
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  return (
    forwarded?.[forwarded.length - 1]
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  ).trim();
}

function unavailable() {
  return NextResponse.json({ error: 'submission-unavailable' }, { status: 503 });
}

/**
 * Handles the explicitly consented callback submission without exposing visitor
 * data or email-provider details in responses.
 */
export async function handleContactRequest(
  request: Request,
  deps: ContactRequestDependencies,
): Promise<NextResponse> {
  const raw: unknown = await request.json().catch(() => null);
  const payload = normalizeContactRequest(raw);
  if (!payload) {
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await deps.verifyToken(payload.turnstileToken);
  } catch {
    verified = false;
  }
  if (!verified) {
    return NextResponse.json({ error: 'verification-required' }, { status: 403 });
  }

  let limit: LimitResult;
  try {
    limit = await deps.limit(clientIp(request));
  } catch {
    return unavailable();
  }
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'too-many-requests' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } },
    );
  }

  if (!deps.resendApiKey || !deps.recipient?.trim()) return unavailable();

  try {
    const result = await deps.send({
      to: deps.recipient.trim(),
      subject: CALLBACK_SUBJECT,
      text: buildContactRequestEmail(payload),
    });
    if (!result.sent) return unavailable();
  } catch {
    return unavailable();
  }

  return NextResponse.json({ submitted: true });
}

export async function POST(request: Request) {
  return handleContactRequest(request, createContactRequestDependencies());
}
