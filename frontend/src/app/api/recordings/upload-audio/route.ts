import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Write file to a temporary location to pass to OpenAI (must be a file stream)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a temporary file path
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `upload-${Date.now()}-${file.name}`);
    fs.writeFileSync(filePath, buffer);

    try {
      // Create a read stream from the temp file
      const stream = fs.createReadStream(filePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: stream,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Cleanup temp file
      fs.unlinkSync(filePath);

      let text = transcription.text;
      if (!text && (transcription as any).segments) {
         text = (transcription as any).segments.map((s: any) => s.text).join(' ');
      }

      return NextResponse.json({ transcript: text });

    } catch (apiError: any) {
      // Cleanup temp file if API fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error('Whisper API Error:', apiError);
      return NextResponse.json({ error: 'Transcription failed: ' + apiError.message }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
