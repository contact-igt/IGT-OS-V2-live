// Gmail meetings API route
// Currently returns mock Fathom/Gemini recaps.
// To wire real Gmail: replace the MOCK_RECAPS array with a Gmail API / MCP call:
//   const threads = await gmail.searchThreads({ query: 'from:no-reply@fathom.video ...', pageSize: 10 });

export const dynamic = 'force-dynamic';

const MOCK_RECAPS = [
  {
    id: 'recap-001',
    subject: 'Fathom Recap: Pixel Eye Hospital — Monthly Review',
    sender: 'no-reply@fathom.video',
    date: '2026-07-08',
    preview: 'Sushil and Dr. Rasheed discussed campaign performance, WhatsApp lead tracking, and Q3 targets...',
    body: `FATHOM MEETING RECAP
Meeting: Pixel Eye Hospital — Monthly Review
Date: July 8, 2026
Duration: 38 minutes
Participants: Sushil Athithiyaa (Invictus), Dr. Rasheed (Pixel Eye), Anitha (Pixel Eye)

SUMMARY:
Sushil opened the meeting reviewing June campaign performance. The WhatsApp lead tracking via WhatsNexus showed 142 leads generated with a 34% conversion to consultations. Dr. Rasheed expressed satisfaction with the numbers but raised concerns about the response time from the front desk team.

KEY POINTS:
- WhatsNexus onboarding for Pooja (front desk manager) to begin this week
- Ad budget confirmed at ₹68,000 for July, same as June
- Weekly lead report to be sent every Friday by 6 PM
- Sushil to prepare revised proposal for video marketing add-on by next Monday
- Dr. Rasheed will confirm video shoot date by July 15
- Monthly Performance Report for June to be sent by July 12

DECISIONS:
1. WhatsNexus onboarding for Pooja begins this week [Binding]
2. Ad budget stays at ₹68,000 for July [Binding]  
3. Weekly lead reports every Friday [Binding]
4. Pooja to manage lead tracking sheet going forward [Non-binding]

NEXT STEPS:
Invictus: Onboard Pooja on WhatsNexus, send June performance report by July 12, prepare video proposal by Monday
Pixel Eye: Confirm video shoot date, ensure Pooja joins onboarding session

Next meeting: August Monthly Review (first week of August)`
  },
  {
    id: 'recap-002',
    subject: 'Fathom Recap: Netralaya Eye Care — Discovery Call',
    sender: 'no-reply@fathom.video',
    date: '2026-07-03',
    preview: 'Initial discovery with Prateek. Discussed digital presence, competitor analysis, and proposal timeline...',
    body: `FATHOM MEETING RECAP
Meeting: Netralaya Eye Care — Discovery Call
Date: July 3, 2026
Duration: 52 minutes
Participants: Sushil Athithiyaa (Invictus), Prateek Sharma (Netralaya), Kavitha R (Netralaya Marketing)

SUMMARY:
Sushil conducted a detailed discovery call with Prateek Sharma, founder of Netralaya Eye Care, a premium ophthalmology chain with 3 locations in Chennai. The prospect expressed frustration with their current digital agency's lack of transparency and measurable outcomes.

KEY DISCUSSION POINTS:
- Current monthly spend with existing agency: ₹45,000 (unsatisfied with results)
- Primary goals: increase consultation bookings, build credibility in LASIK space
- Competitor Sankara Eye Care dominating Google Ads — need aggressive counter-strategy
- Interest in WhatsApp CRM, SEO content, and performance marketing
- Prateek wants a revised proposal by July 4 at 12 PM for board review
- Agreed value discussed: ₹60,000/month retainer + ₹15,000 setup fee

DECISIONS:
1. Revised proposal to be shared by July 4 noon [Binding - Sushil confirmed]
2. Kavitha to share current website analytics access [Binding]
3. Trial period of 3 months before full commitment [Discussed, not finalized]

OPEN QUESTIONS:
- Will there be a board approval needed above ₹60K?
- Is Google Business Profile currently managed in-house?
- Video content budget — separate or included in retainer?

NEXT STEPS:
Invictus: Revised proposal with competitor analysis and 90-day roadmap by July 4 noon
Netralaya: Kavitha to share GA4 and Search Console access`
  },
  {
    id: 'recap-003',
    subject: 'Gemini Notes: Internal Team — Sprint Planning',
    sender: 'gemini-notes@google.com',
    date: '2026-07-07',
    preview: 'Internal sprint review with design and dev team. Task redistribution, upcoming deadlines...',
    body: `GOOGLE GEMINI MEETING NOTES
Meeting: Internal Sprint Planning — Week 28
Date: July 7, 2026  
Duration: 45 minutes
Participants: Sushil, Abhilash (Dev), Thilaga (Design), Meena (Content), Pragathi (Performance)

AGENDA COVERED:
1. Sprint 27 review — what shipped vs what slipped
2. Week 28 priorities per client
3. Bandwidth assessment

SPRINT 27 OUTCOMES:
- Pixel Eye video edit: Completed ✅
- Netralaya landing page v2: In progress (Abhilash 70% done, needs Thilaga for graphics)
- Bhargavi Skin Clinic Instagram content for July: Pending (Meena to finalize this week)
- MedCare Max Google Ads campaign refresh: Done ✅

WEEK 28 PRIORITIES:
- Netralaya landing page: Complete by July 10 (Abhilash + Thilaga)
- Pixel Eye WhatsApp automation setup: Abhilash leads, target July 12
- Bhargavi content calendar for July: Meena by July 9
- Performance reports for all clients: Pragathi by July 12

BANDWIDTH:
Abhilash: 85% utilized — do not add more tasks this sprint
Thilaga: 60% — can take one more design task
Meena: 70% — manageable
Pragathi: 55% — available for new campaign setups

INTERNAL DECISIONS:
- Move to weekly standups (Mon + Thu) starting next week
- Introduce task estimate field in all new task creation
- Sushil to review all client deliverables before dispatch (quality gate)`
  }
];

export async function GET() {
  // Simulate a small network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  return Response.json(MOCK_RECAPS);
}
