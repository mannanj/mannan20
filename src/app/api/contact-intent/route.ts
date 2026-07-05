import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { ContactIntentCategory, ContactIntentCategoryKey, ContactIntentResult } from '@/lib/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'contact-intent',
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-v3.2';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_RESPONSE_MESSAGE_LENGTH = 400;

const CATEGORY_KEYS: ContactIntentCategoryKey[] = [
  'job_opportunity',
  'collaboration',
  'project_interest',
  'speaking_media',
  'networking',
];

const SYSTEM_PROMPT = `You are helping Mannan Javid craft a warm, personalized reply for someone who just reached out through his portfolio's contact form. His email and phone number have already been shown to them — this is a bonus follow-up, not a gate, so never withhold or ask for more information.

Read their free-form text (their name and/or why they're reaching out) and classify which of these categories apply. A message can match zero, one, or several:
- job_opportunity: a full-time or contract job offer, role, or hiring inquiry
- collaboration: a freelance, consulting, or collaboration proposal
- project_interest: they mention a specific project or app of his by name
- speaking_media: a speaking, interview, podcast, or media request
- networking: general networking, an introduction, or "just saying hi" with no specific ask

Then write a short "message" (2-4 sentences, warm and specific, no links, no bullet points): thank them by name if given, acknowledge what they mentioned, and if a category was detected, note he'd love to hear more about it. If the text is too short or vague to say anything specific, keep it a brief warm generic thank-you.

Use the record_contact_intent tool to return your findings.`;

const INTENT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'record_contact_intent',
    description: 'Record the detected intent categories and a personalized reply message',
    parameters: {
      type: 'object',
      properties: {
        categories: {
          type: 'object',
          properties: Object.fromEntries(CATEGORY_KEYS.map(key => [key, { type: 'boolean' }])),
          required: CATEGORY_KEYS,
        },
        message: {
          type: 'string',
          description: 'Short, warm, personalized reply (2-4 sentences, no links)',
        },
      },
      required: ['categories', 'message'],
    },
  },
};

const EMPTY_RESULT: ContactIntentResult = {
  categories: CATEGORY_KEYS.map(key => ({ key, detected: false })),
  message: '',
};

function normalizeCategories(raw: unknown): ContactIntentCategory[] {
  const record = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
  return CATEGORY_KEYS.map(key => ({ key, detected: record[key] === true }));
}

function normalizeResult(parsed: Record<string, unknown>): ContactIntentResult | null {
  if (typeof parsed.message !== 'string') return null;
  return {
    categories: normalizeCategories(parsed.categories),
    message: parsed.message.slice(0, MAX_RESPONSE_MESSAGE_LENGTH),
  };
}

function parseContentFallback(content: string | null | undefined): ContactIntentResult | null {
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

    if (message.length > MAX_MESSAGE_LENGTH) {
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
        tools: [INTENT_TOOL],
        tool_choice: { type: 'function', function: { name: 'record_contact_intent' } },
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
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
