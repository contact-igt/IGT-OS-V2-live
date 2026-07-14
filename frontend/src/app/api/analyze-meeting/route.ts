import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

function buildPrompt(transcript: string, context: { clients: string[]; team: string[] }, analysisPreference?: string): string {
  let roleInstruction = '';
  switch (analysisPreference) {
    case 'sales':
      roleInstruction = `Focus on sales insights: deal overview, pain points, buying signals, objections, competitors, decision makers. Extract these into "salesInsights".`;
      break;
    case 'project-management':
      roleInstruction = `Focus on project health, timeline, resources, sprint metrics, and risk register. Extract these into "projectInsights".`;
      break;
    case 'technical':
      roleInstruction = `Focus on technical decisions, architecture, infrastructure costs, and ROI. Extract these into "aiInsights".`;
      break;
    default:
      roleInstruction = `Focus on meeting effectiveness, sentiment, and dynamics. Extract these into "roleInsights".`;
      break;
  }

  return `You are the meeting intelligence engine for Invictus Global Tech, a Chennai-based digital marketing agency.

CLIENTS: ${context.clients.join(', ')}
TEAM: ${context.team.join(', ')}

MEETING TYPE CONTEXT:
- "Discussion Call" or "Discovery" → sales/strategy call  
- "Monthly Meeting" or "Review" → client review
- "Onboarding" → implementation call
- Team members only → internal meeting

${roleInstruction}

Analyze the following meeting transcript and return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "summary": "string - brief overview of the meeting",
  "keyPoints": ["string - bullet points"],
  "keywords": ["string - tags"],
  "projectInsights": "string or null",
  "salesInsights": "string or null",
  "aiInsights": "string or null",
  "roleInsights": "string or null",
  "meetingMeta": {
    "title": "string",
    "date": "YYYY-MM-DD or null",
    "durationMinutes": 30,
    "meetingType": "discovery|proposal|proposal_revision|deal_closed|onboarding|monthly_review|strategy_review|internal_team|product",
    "clientName": "string or null",
    "clientContact": "string or null",
    "invictusLead": "string or null",
    "participants": [{ "name": "string", "side": "invictus|client|external" }]
  },
  "talkTime": {
    "participants": [
      {
        "name": "string",
        "estimatedPercent": 55,
        "dominanceRating": "dominant|balanced|quiet",
        "sentimentTone": "positive|neutral|cautious|frustrated|confused",
        "speakingPattern": "string describing their role in the conversation",
        "side": "invictus|client|external"
      }
    ],
    "clientTalkPercent": 35,
    "invictusTalkPercent": 55,
    "conversationBalance": "balanced|invictus_heavy|client_heavy",
    "balanceNote": "string coaching insight"
  },
  "meetingQuality": {
    "score": 7,
    "rating": "excellent|good|average|poor|alarming",
    "flags": ["talk_imbalance"],
    "positives": ["string"],
    "issues": ["string"],
    "narrative": "2-3 sentence honest assessment"
  },
  "decisions": [
    {
      "decision": "string",
      "decidedBy": "string or null",
      "isBinding": true,
      "sourceQuote": "exact quote from transcript"
    }
  ],
  "actionItems": [
    {
      "title": "clear actionable task title under 80 chars",
      "description": "context from the meeting",
      "owner": "team member name or null",
      "ownerSide": "invictus|client",
      "deadline": "YYYY-MM-DD or null",
      "deadlineVerbatim": "what the transcript said about timing",
      "priority": "critical|high|medium|low",
      "confidence": "high|medium|low",
      "sourceQuote": "exact text that generated this task"
    }
  ],
  "momClient": {
    "subject": "email subject line",
    "greeting": "Dear [Name],",
    "openingPara": "warm professional 1-2 sentence opening",
    "keyDecisions": ["string"],
    "nextStepsInvictus": ["string"],
    "nextStepsClient": ["string"],
    "nextMeetingNote": "string or null",
    "closingPara": "professional warm close",
    "signoff": "Warm regards,\\nSushil Athithiyaa\\nFounder & CEO, Invictus Global Tech"
  },
  "momTeam": {
    "heading": "CLIENT — Meeting Type · Date",
    "clientSnapshot": "2 sentences about client current state",
    "dealStatus": "where things stand commercially",
    "whatWeCommitted": ["string"],
    "whatClientCommitted": ["string"],
    "watchOuts": ["risk or thing to monitor"],
    "teamActions": [{ "who": "string", "what": "string", "by": "string" }],
    "internalNotes": "honest internal context not for sharing"
  },
  "openQuestions": ["string - unresolved items"],
  "leadCycleUpdate": {
    "currentStage": "discovery|proposal|proposal_revision|deal_closed|onboarding|monthly_review|churned|paused",
    "stageChange": false,
    "commercialUpdate": {
      "proposedValue": "string or null",
      "agreedValue": "string or null",
      "negotiationNote": "string or null"
    }
  }
}

Only include actionItems with confidence medium or high. Do not invent tasks not explicitly mentioned.
Return ONLY the JSON object. Absolutely no markdown fences, no preamble, no explanation.

TRANSCRIPT:
${transcript}`;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, context, analysisPreference } = await req.json();

    if (!transcript || transcript.length < 100) {
      return NextResponse.json({ error: 'Transcript too short (minimum 100 characters)' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('REPLACE_WITH_YOUR_KEY')) {
      return NextResponse.json({
        error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local and restart the dev server.',
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a highly analytical meeting assistant. Always output purely valid JSON with no markdown formatting or extra text.'
        },
        {
          role: 'user',
          content: buildPrompt(transcript, context || { clients: [], team: [] }, analysisPreference)
        }
      ]
    });

    const raw = response.choices[0].message.content || '{}';

    try {
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
