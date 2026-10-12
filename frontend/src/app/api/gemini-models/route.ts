import { NextResponse } from 'next/server';
import { getServerSecret } from '@/lib/serverSecrets';
import { requireAiUser } from '@/lib/aiGuard';

export const dynamic = 'force-dynamic';

// Lists available Gemini models for whichever key is currently configured, instead of
// hardcoding model name strings that Google can rename/deprecate over time.
export async function GET(req: Request) {
  const denied = await requireAiUser(req);
  if (denied) return denied;
  try {
    const apiKey = await getServerSecret('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured. Add it under Credentials → API Keys.' }, { status: 500 });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data: any = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Failed to list Gemini models' }, { status: 500 });
    }

    // Non-conversational specialty families Gemini's API also lists (TTS, robotics,
    // image-gen, embeddings, etc.) that aren't relevant for text meeting analysis.
    const IRRELEVANT_FAMILY = /tts|robotics|computer-use|deep-research|antigravity|lyria|nano-banana|gemma|embedding|aqa/i;

    const models = (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => ({
        // Gemini model resource names come back as "models/gemini-2.0-flash" — strip the prefix.
        name: m.name.replace(/^models\//, ''),
        displayName: m.displayName || m.name,
      }))
      .filter((m: any) => !IRRELEVANT_FAMILY.test(m.name))
      // Cheaper/faster "flash" models first, non-preview/experimental ones ahead of
      // preview builds (which are more likely to have restricted or shifting availability).
      .sort((a: any, b: any) => {
        const score = (m: any) => (m.name.includes('flash') ? 0 : 2) + (/preview|exp/i.test(m.name) ? 1 : 0);
        return score(a) - score(b);
      });

    return NextResponse.json(models);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
