import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { prompt, clients, teamMembers, categories } = await req.json();
    
    // Simulate or use real OpenAI depending on env var
    if (!process.env.OPENAI_API_KEY) {
      // Dummy logic for testing without API key
      return NextResponse.json({
        title: "Mock AI Parsed Task",
        type: "task",
        clientId: clients[0]?.id || "",
        category: "performance_marketing",
        priority: "high",
        assignedTo: [teamMembers[0]?.id],
        estimatedHours: "4",
        description: prompt,
        tags: "ai-generated",
        deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
      });
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
