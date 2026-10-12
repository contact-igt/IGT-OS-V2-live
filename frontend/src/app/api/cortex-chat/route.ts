import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSecret } from '@/lib/serverSecrets';
import { requireAiUser } from '@/lib/aiGuard';

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
  }, { timeout: PROVIDER_TIMEOUT_MS });
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
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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
    model: 'claude-sonnet-5-5',
    max_tokens: 1200,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  }, { timeout: PROVIDER_TIMEOUT_MS });
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

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const PROVIDER_TIMEOUT_MS = 30_000;

// Only user/assistant turns of bounded size are forwarded - a client can never inject a 'system' turn.
function sanitizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    out.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) });
  }
  return out[out.length - 1].role === 'user' ? out : null;
}

// Permission-grounded context is built by the BACKEND for the verified caller (see backend/src/routes/cortex.ts).
async function fetchServerContext(authorization: string): Promise<{ systemPrompt: string } | { error: string; status: number }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${baseUrl}/api/cortex/context`, { headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error || 'Could not load your data for Cortex', status: res.status === 429 ? 429 : res.status === 401 ? 401 : 502 };
    return { systemPrompt: body.systemPrompt };
  } catch {
    return { error: 'Cortex could not reach the data service. Nothing was answered from guesswork - please retry.', status: 503 };
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAiUser(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    // NOTE: any client-supplied systemPrompt is deliberately ignored.
    const messages = sanitizeMessages(body?.messages);
    if (!messages) return NextResponse.json({ error: 'messages must be a non-empty list of user/assistant turns ending with a user message' }, { status: 400 });

    const ctx = await fetchServerContext(req.headers.get('authorization') as string);
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    const systemPrompt = ctx.systemPrompt;

    const errors: string[] = [];
    let anyConfigured = false;

    for (const provider of PROVIDERS) {
      try {
        const reply = await provider.run(systemPrompt, messages);
        if (reply === null) continue; // not configured, try the next provider
        anyConfigured = true;
        if (reply.trim()) return NextResponse.json({ reply });
        errors.push(`${provider.name}: empty response`);
      } catch (err: any) {
        anyConfigured = true;
        errors.push(`${provider.name}: ${err.name === 'TimeoutError' ? 'timed out' : err.message || 'request failed'}`);
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
