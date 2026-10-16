import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAiUser } from '@/lib/aiGuard';

export async function POST(req: Request) {
  const denied = await requireAiUser(req);
  if (denied) return denied;
  try {
    const { prompt, clients, teamMembers, categories } = await req.json();
    
    // No fake "parsed" task when AI isn't configured: that would let a user save invented data as a real task.
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI task parsing is not configured. Create the task manually.' }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const systemPrompt = `You are a helpful assistant that parses natural language task descriptions into a structured JSON object.
Here is the contextual data:
Clients: ${JSON.stringify(clients.map((c: any) => ({id: c.id, name: c.name})))}
Team Members: ${JSON.stringify(teamMembers.map((m: any) => ({id: m.id, name: m.name})))}
Categories: ${categories.join(', ')}

Return ONLY a JSON object matching this schema:
{
  "title": "string",
  "type": "goal | task | subtask",
  "clientId": "string (match id from Clients list)",
  "category": "string (match from Categories list)",
  "priority": "critical | high | medium | low",
  "assignedTo": ["string (match id from Team Members list)"],
  "estimatedHours": "number string",
  "description": "string",
  "tags": "comma separated string",
  "deadline": "YYYY-MM-DDTHH:mm string (if implied, otherwise null)"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI Parse error:", error);
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
