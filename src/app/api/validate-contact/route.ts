import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { LLMValidationResult } from '@/lib/types';

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
    token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'contact-validate',
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-v3.2';

const SYSTEM_PROMPT = `You are a contact form validator. Extract the following fields from the user's free-form text:
- name: The person's name
- email: Their email address
- reason: Why they are reaching out

Use the validate_contact_info tool to return your findings. Mark each field as found: true with the extracted value, or found: false with an empty string if not present.`;

const VALIDATE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'validate_contact_info',
    description: 'Validate and extract contact information from user input',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'value'],
        },
        email: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'value'],
        },
        reason: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'value'],
        },
      },
      required: ['name', 'email', 'reason'],
    },
  },
};

const EMPTY_RESULT: LLMValidationResult = {
  name: { found: false, value: '' },
  email: { found: false, value: '' },
  reason: { found: false, value: '' },
};

function isValidField(field: unknown): field is { found: boolean; value: string } {
  return (
    typeof field === 'object' &&
    field !== null &&
    'found' in field &&
    'value' in field &&
    typeof (field as Record<string, unknown>).found === 'boolean' &&
    typeof (field as Record<string, unknown>).value === 'string'
  );
}

function parseContentFallback(content: string | null | undefined): LLMValidationResult | null {
  if (!content) return null;
  try {
    const stripped = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(stripped);
    if (isValidField(parsed.name) && isValidField(parsed.email) && isValidField(parsed.reason)) {
      return parsed as LLMValidationResult;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? '127.0.0.1';

    const { success, remaining, reset } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', remaining, reset },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(EMPTY_RESULT);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        tools: [VALIDATE_TOOL],
        tool_choice: { type: 'function', function: { name: 'validate_contact_info' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status} ${errorText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed: LLMValidationResult = JSON.parse(toolCall.function.arguments);
        return NextResponse.json(parsed);
      } catch {}
    }

    const messageContent = data.choices?.[0]?.message?.content;
    const fallback = parseContentFallback(messageContent);
    if (fallback) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json(EMPTY_RESULT);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
