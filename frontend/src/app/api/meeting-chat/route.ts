import { Anthropic } from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { question, transcript, previousMessages = [] } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('REPLACE_WITH_YOUR_KEY')) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.',
      }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are a helpful AI meeting assistant for Invictus Global Tech. 
The user is asking questions about the following meeting transcript. Answer accurately based ONLY on the transcript. If the transcript does not contain the answer, say so. Keep your answers concise and directly quote the transcript where useful.

TRANSCRIPT:
${transcript || "No transcript provided."}`;

    // Format previous messages for Anthropic
    const messages = previousMessages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    // Add current question
    messages.push({
      role: 'user',
      content: question
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      temperature: 0.3,
      system: systemPrompt,
      messages: messages
    });

    return NextResponse.json({ 
      answer: (response.content[0] as any).text 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
