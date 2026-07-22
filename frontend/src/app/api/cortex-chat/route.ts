import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, messages } = await req.json();

    if (!systemPrompt || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'systemPrompt and messages are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('REPLACE_WITH_YOUR_KEY')) {
      return NextResponse.json({
        error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.',
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const reply = response.choices[0].message.content || 'No response received.';
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
