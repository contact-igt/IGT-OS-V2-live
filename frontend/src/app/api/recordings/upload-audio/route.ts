import { NextRequest, NextResponse } from 'next/server';
import { getServerSecret } from '@/lib/serverSecrets';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const apiKey = await getServerSecret('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured. Add it under Credentials → API Keys.' }, { status: 500 });
    }

    // Gemini accepts audio as inline base64 data directly in the request body — no temp
    // file/stream needed the way Whisper's SDK required.
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'audio/mpeg';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Transcribe this audio recording verbatim. Return only the raw transcript text — no timestamps, no speaker labels, no commentary, no markdown.' },
              { inlineData: { mimeType, data: base64Audio } },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    const data: any = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini transcription error:', data);
      return NextResponse.json({ error: data.error?.message || 'Transcription failed' }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ transcript: text.trim() });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
