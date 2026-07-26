import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSecret } from '@/lib/serverSecrets';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

async function tryOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
  const apiKey = await getServerSecret('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
  if (!apiKey || apiKey.includes('REPLACE_WITH_YOUR_KEY')) return null;

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1200,
    temperature: 0.4,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });
  return response.choices[0].message.content || null;
}

async function tryGemini(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
  const apiKey = await getServerSecret('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
      }),
    }
  );
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function tryAnthropic(systemPrompt: string, messages: ChatMessage[]): Promise<string | null> {
  const apiKey = await getServerSecret('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY);
  if (!apiKey) return null;

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1200,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : null;
}

// Tries each configured AI provider in turn — OpenAI, then Gemini, then Anthropic — so a
// single provider outage or exhausted quota doesn't take Cortex chat down entirely as long
// as at least one other key is configured under Credentials → API Keys.
const PROVIDERS: { name: string; run: (systemPrompt: string, messages: ChatMessage[]) => Promise<string | null> }[] = [
  { name: 'OpenAI', run: tryOpenAI },
  { name: 'Gemini', run: tryGemini },
  { name: 'Anthropic', run: tryAnthropic },
];

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, messages } = await req.json();

    if (!systemPrompt || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'systemPrompt and messages are required' }, { status: 400 });
    }

    const errors: string[] = [];
    let anyConfigured = false;

    for (const provider of PROVIDERS) {
      try {
        const reply = await provider.run(systemPrompt, messages);
        if (reply === null) continue; // not configured, try the next provider
        anyConfigured = true;
        if (reply.trim()) return NextResponse.json({ reply });
      } catch (err: any) {
        anyConfigured = true;
        errors.push(`${provider.name}: ${err.message || 'request failed'}`);
      }
    }

    if (!anyConfigured) {
      return NextResponse.json({
        error: 'No AI provider is configured. Add an OpenAI, Gemini, or Anthropic key under Credentials → API Keys.',
      }, { status: 500 });
    }
    return NextResponse.json({
      error: `All configured AI providers failed. ${errors.join(' | ')}`,
    }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
