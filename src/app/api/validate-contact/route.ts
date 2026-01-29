import { NextRequest, NextResponse } from 'next/server';
import type { LLMValidationResult } from '@/lib/types';

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

export async function POST(request: NextRequest) {
  try {
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

    if (!toolCall?.function?.arguments) {
      return NextResponse.json(EMPTY_RESULT);
    }

    const parsed: LLMValidationResult = JSON.parse(toolCall.function.arguments);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
