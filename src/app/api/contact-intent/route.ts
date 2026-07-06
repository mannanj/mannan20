import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { ContactIntentResult } from '@/lib/types';
import { MAX_MESSAGE_LENGTH, alreadyAskedQuestion, normalizeResult, parseContentFallback, sanitizeHistory } from '@/lib/contact-intent-logic';

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

const SYSTEM_PROMPT_BASE = `You are helping Mannan Javid reply to someone chatting with him through his portfolio's contact form. His email and phone have already been shown to them — this is a bonus follow-up, not a gate, so never withhold information or ask for anything before helping.

Read the conversation so far and their latest message. Reply with ONE short, warm message (max 2 sentences) — thank them and acknowledge what they said, using their name if they gave one. Recognize whatever they're reaching out about — a job, a project, a collaboration, a speaking or media request, just saying hi, or anything else — without trying to sort it into a fixed category.

Never ask for more detail than needed, never mention categories or classification, never pad the reply with an unsolicited offer.`;

const QUESTION_ALLOWED_CLAUSE = `You may ask exactly one brief clarifying question, but only if it would concretely help Mannan act on this (for example: they mention a job with no company named, or a project with no clear ask). Most replies should NOT include a question — default to a plain thank-you, and only ask when it's genuinely useful.`;

const QUESTION_USED_CLAUSE = `You have already asked your one allowed clarifying question earlier in this thread. Do not ask another question of any kind this time — only acknowledge.`;

const INTENT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'record_reply',
    description: 'Record the reply message and whether it asks a clarifying question',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Short, warm reply (max 2 sentences, no links)',
        },
        askedQuestion: {
          type: 'boolean',
          description: 'true if `message` itself asks the user a clarifying question',
        },
      },
      required: ['message', 'askedQuestion'],
    },
  },
};

const EMPTY_RESULT: ContactIntentResult = { message: '' };

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

    const body = await request.json();
    const { message } = body;

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

    const history = sanitizeHistory(body.history);
    const askedAlready = alreadyAskedQuestion(history);
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${askedAlready ? QUESTION_USED_CLAUSE : QUESTION_ALLOWED_CLAUSE}`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        tools: [INTENT_TOOL],
        tool_choice: { type: 'function', function: { name: 'record_reply' } },
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
        const normalized = normalizeResult(parsed, askedAlready);
        if (normalized) return NextResponse.json(normalized);
      } catch {}
    }

    const messageContent = data.choices?.[0]?.message?.content;
    const fallback = parseContentFallback(messageContent, askedAlready);
    if (fallback) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json(EMPTY_RESULT);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
