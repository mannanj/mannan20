import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  createContactRequestDependencies,
  handleContactRequest,
} from './route';
import { limitContactRequest, type LimitResult } from '@/lib/rate-limit';
import { sendEmail, type SendEmailInput, type SendEmailResult } from '@/lib/email';
import { verifyTurnstileToken } from '@/lib/turnstile-verification';

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/contact-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  contact: 'visitor@example.com',
  reason: 'I would like to discuss a focused collaboration.',
  transcript: [{ userText: 'Could we explore a project?', aiReply: 'A focused prototype could help.' }],
  turnstileToken: 'fresh-turnstile-proof',
};

const permittedLimit: LimitResult = {
  success: true,
  limit: 4,
  remaining: 3,
  reset: Date.now() + 60_000,
};

function dependencies(overrides: Partial<Parameters<typeof handleContactRequest>[1]> = {}) {
  return {
    verifyToken: async () => true,
    limit: async () => permittedLimit,
    send: async () => ({ sent: true }),
    resendApiKey: 'test-key',
    recipient: 'recipient@example.com',
    ...overrides,
  };
}

describe('contact request route', () => {
  test('builds POST dependencies from server configuration with the public fallback', () => {
    const configured = createContactRequestDependencies(
      { RESEND_API_KEY: 'test-key', CONTACT_REQUEST_TO: 'configured@example.com' },
    );
    expect(configured.verifyToken).toBe(verifyTurnstileToken);
    expect(configured.limit).toBe(limitContactRequest);
    expect(configured.send).toBe(sendEmail);
    expect(configured.resendApiKey).toBe('test-key');
    expect(configured.recipient).toBe('configured@example.com');

    expect(createContactRequestDependencies(
      { RESEND_API_KEY: 'test-key', CONTACT_REQUEST_TO: '  ' },
    ).recipient).toBe('hello@mannan.is');
  });

  test('validates the payload before calling external boundaries', async () => {
    let verifyCalls = 0;
    let limitCalls = 0;
    let sendCalls = 0;

    const response = await handleContactRequest(request({}), dependencies({
      verifyToken: async () => { verifyCalls += 1; return true; },
      limit: async () => { limitCalls += 1; return permittedLimit; },
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid-request' });
    expect({ verifyCalls, limitCalls, sendCalls }).toEqual({ verifyCalls: 0, limitCalls: 0, sendCalls: 0 });
  });

  test('rejects invalid or replayed human proof before the email provider', async () => {
    let limitCalls = 0;
    let sendCalls = 0;
    const response = await handleContactRequest(request(validPayload), dependencies({
      verifyToken: async () => false,
      limit: async () => { limitCalls += 1; return permittedLimit; },
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'verification-required' });
    expect({ limitCalls, sendCalls }).toEqual({ limitCalls: 0, sendCalls: 0 });
  });

  test('fails closed when verification cannot be completed', async () => {
    let sendCalls = 0;
    const response = await handleContactRequest(request(validPayload), dependencies({
      verifyToken: async () => { throw new Error('private verifier detail'); },
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'verification-required' });
    expect(sendCalls).toBe(0);
  });

  test('rate limiting prevents an email and includes retry-after', async () => {
    let sendCalls = 0;
    const response = await handleContactRequest(request(validPayload), dependencies({
      limit: async () => ({ ...permittedLimit, success: false, remaining: 0 }),
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
    expect(await response.json()).toEqual({ error: 'too-many-requests' });
    expect(sendCalls).toBe(0);
  });

  test('returns unavailable when rate limiting cannot be checked', async () => {
    let sendCalls = 0;
    const response = await handleContactRequest(request(validPayload), dependencies({
      limit: async () => { throw new Error('private rate limit detail'); },
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'submission-unavailable' });
    expect(sendCalls).toBe(0);
  });

  test('fails safely when server email configuration is incomplete', async () => {
    let sendCalls = 0;
    const noKey = await handleContactRequest(request(validPayload), dependencies({
      resendApiKey: undefined,
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));
    const noRecipient = await handleContactRequest(request(validPayload), dependencies({
      recipient: undefined,
      send: async () => { sendCalls += 1; return { sent: true }; },
    }));

    expect(noKey.status).toBe(503);
    expect(noRecipient.status).toBe(503);
    expect(await noKey.json()).toEqual({ error: 'submission-unavailable' });
    expect(await noRecipient.json()).toEqual({ error: 'submission-unavailable' });
    expect(sendCalls).toBe(0);
  });

  test('returns a safe failure when the email provider rejects delivery', async () => {
    const response = await handleContactRequest(request(validPayload), dependencies({
      send: async (): Promise<SendEmailResult> => ({ sent: false, error: 'provider-private-detail' }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'submission-unavailable' });
  });

  test('sends a fixed server-owned message and confirms provider acceptance', async () => {
    let email: SendEmailInput | undefined;
    const response = await handleContactRequest(request(validPayload), dependencies({
      send: async (input) => { email = input; return { sent: true }; },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ submitted: true });
    expect(email).toEqual({
      to: 'recipient@example.com',
      subject: 'Portfolio callback request',
      text: 'Portfolio callback request\n\nContact: visitor@example.com\n\nReason:\nI would like to discuss a focused collaboration.\n\nConversation:\nVisitor: Could we explore a project?\nAI reflection: A focused prototype could help.\n',
    });
  });
});
