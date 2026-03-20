import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { LLMFieldResult, LLMValidationResult } from '@/lib/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'contact-validate',
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-v3.2';

const SYSTEM_PROMPT = `You are a contact form validator. Extract the following fields from the user's free-form text:
- name: The person's name
- email: Their email address
- reason: Why they are reaching out

Use the validate_contact_info tool to return your findings. For each field:
- found: true, partial: false — field is fully provided
- found: false, partial: true — user started entering it but didn't finish (e.g., "My name is" with no name, "my email is" with no address)
- found: false, partial: false — field not mentioned at all

Also generate a short, friendly "feedback" message summarizing what was found and what's still needed. Examples:
- All found: "Thanks John! Got your name, email, and reason."
- Name only: "Thanks for sharing your name, John! Feel free to add your email or reason for reaching out."
- Partial name: "Looks like you started entering your name — go ahead and finish!"
- Nothing found: "Include your name, email, or why you're here."
Keep feedback under 120 characters, warm and casual.`;

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
            partial: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'partial', 'value'],
        },
        email: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            partial: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'partial', 'value'],
        },
        reason: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            partial: { type: 'boolean' },
            value: { type: 'string' },
          },
          required: ['found', 'partial', 'value'],
        },
        feedback: {
          type: 'string',
          description: 'Friendly message summarizing what was found and what is still needed',
        },
      },
      required: ['name', 'email', 'reason', 'feedback'],
    },
  },
};

const EMPTY_RESULT: LLMValidationResult = {
  name: { found: false, partial: false, value: '' },
  email: { found: false, partial: false, value: '' },
  reason: { found: false, partial: false, value: '' },
  feedback: '',
};

function isValidField(field: unknown): field is { found: boolean; partial: boolean; value: string } {
  if (
    typeof field !== 'object' ||
    field === null ||
    !('found' in field) ||
    !('value' in field) ||
    typeof (field as Record<string, unknown>).found !== 'boolean' ||
    typeof (field as Record<string, unknown>).value !== 'string'
  ) return false;
  const f = field as Record<string, unknown>;
  if ('partial' in f && typeof f.partial !== 'boolean') return false;
  return true;
}

const MAX_FIELD_VALUE_LENGTH = 200;
const MAX_FEEDBACK_LENGTH = 200;

function normalizeField(field: { found: boolean; partial?: boolean; value: string }): LLMFieldResult {
  return {
    found: field.found,
    partial: field.partial ?? false,
    value: field.value.slice(0, MAX_FIELD_VALUE_LENGTH),
  };
}

function normalizeResult(parsed: Record<string, unknown>): LLMValidationResult | null {
  if (!isValidField(parsed.name) || !isValidField(parsed.email) || !isValidField(parsed.reason)) return null;
  return {
    name: normalizeField(parsed.name as { found: boolean; partial?: boolean; value: string }),
    email: normalizeField(parsed.email as { found: boolean; partial?: boolean; value: string }),
    reason: normalizeField(parsed.reason as { found: boolean; partial?: boolean; value: string }),
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback.slice(0, MAX_FEEDBACK_LENGTH) : '',
  };
}

function parseContentFallback(content: string | null | undefined): LLMValidationResult | null {
  if (!content) return null;
  try {
    const stripped = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(stripped);
    return normalizeResult(parsed);
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

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
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
        const parsed = JSON.parse(toolCall.function.arguments);
        const normalized = normalizeResult(parsed);
        if (normalized) return NextResponse.json(normalized);
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
