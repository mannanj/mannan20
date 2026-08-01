import { describe, expect, test } from 'bun:test';
import {
  buildContactRequestEmail,
  normalizeContactRequest,
} from './contact-request';

const validRequest = {
  contact: '  person@example.com  ',
  reason: '  I would like to discuss a small research collaboration.  ',
  transcript: [
    { userText: 'Could we talk about a project?', aiReply: 'A focused prototype could be a useful next step.' },
  ],
  turnstileToken: 'fresh-proof',
};

describe('normalizeContactRequest', () => {
  test('trims and requires contact and reason within their exact bounds', () => {
    const payload = normalizeContactRequest(validRequest);
    expect(payload).toMatchObject({
      contact: 'person@example.com',
      reason: 'I would like to discuss a small research collaboration.',
    });

    expect(normalizeContactRequest({ ...validRequest, contact: 'ab' })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, contact: 'c'.repeat(255) })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, reason: 'too short' })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, reason: 'r'.repeat(1001) })).toBeNull();
  });

  test('requires a token but does not place it in the email body', () => {
    expect(normalizeContactRequest({ ...validRequest, turnstileToken: '   ' })).toBeNull();
    const payload = normalizeContactRequest(validRequest);
    expect(payload).not.toBeNull();

    expect(buildContactRequestEmail(payload!)).not.toContain('fresh-proof');
  });

  test('accepts at most three complete bounded transcript turns', () => {
    expect(normalizeContactRequest({
      ...validRequest,
      transcript: Array.from({ length: 3 }, (_, index) => ({
        userText: `Visitor ${index}`,
        aiReply: `Reflection ${index}.`,
      })),
    })?.transcript).toHaveLength(3);

    expect(normalizeContactRequest({
      ...validRequest,
      transcript: Array.from({ length: 4 }, () => ({ userText: 'Visitor', aiReply: 'Reflection.' })),
    })).toBeNull();
    expect(normalizeContactRequest({
      ...validRequest,
      transcript: [{ userText: 'u'.repeat(1001), aiReply: 'Reflection.' }],
    })).toBeNull();
    expect(normalizeContactRequest({
      ...validRequest,
      transcript: [{ userText: 'Visitor', aiReply: 'a'.repeat(481) }],
    })).toBeNull();
  });

  test('rejects partial, malformed, extra, and serialized-overflow transcript entries', () => {
    expect(normalizeContactRequest({ ...validRequest, transcript: [{ userText: 'Visitor' }] })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, transcript: [{ userText: 'Visitor', aiReply: 'Reflection.', status: 'partial' }] })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, transcript: [{ userText: 12, aiReply: 'Reflection.' }] })).toBeNull();
    expect(normalizeContactRequest({ ...validRequest, transcript: [{ userText: 'Visitor', aiReply: 'Reflection.', error: 'upstream' }] })).toBeNull();
    expect(normalizeContactRequest({
      ...validRequest,
      transcript: Array.from({ length: 3 }, () => ({ userText: 'u'.repeat(1000), aiReply: 'a'.repeat(480) })),
    })).toBeNull();
  });

  test('requires exact payload keys and normalizes CRLF to LF', () => {
    expect(normalizeContactRequest({ ...validRequest, extra: true })).toBeNull();
    const payload = normalizeContactRequest({
      ...validRequest,
      contact: ' person\r\n@example.com ',
      reason: 'A reason\r\nwith enough detail.',
      transcript: [{ userText: 'Visitor\r\ntext', aiReply: 'Reflection\r\ntext.' }],
    });

    expect(payload).toEqual({
      contact: 'person\n@example.com',
      reason: 'A reason\nwith enough detail.',
      transcript: [{ userText: 'Visitor\ntext', aiReply: 'Reflection\ntext.' }],
      turnstileToken: 'fresh-proof',
    });
  });
});

describe('buildContactRequestEmail', () => {
  test('uses fixed labels and keeps visitor data in the plain-text body', () => {
    const payload = normalizeContactRequest({
      ...validRequest,
      contact: 'visitor@example.com\r\nBcc: injected@example.com',
      reason: 'This is long enough.\r\nSubject: injected',
    });
    expect(payload).not.toBeNull();

    expect(buildContactRequestEmail(payload!)).toBe(
      'Portfolio callback request\n\nContact: visitor@example.com\nBcc: injected@example.com\n\nReason:\nThis is long enough.\nSubject: injected\n\nConversation:\nVisitor: Could we talk about a project?\nAI reflection: A focused prototype could be a useful next step.\n',
    );
  });
});
