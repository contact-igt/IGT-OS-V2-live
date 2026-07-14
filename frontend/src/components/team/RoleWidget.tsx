'use client';

import { useApp } from '@/contexts/AppContext';

export default function RoleWidget() {
  const { state } = useApp();
  const user = state.teamMembers.find(m => m.id === state.currentUserId);
  
  if (!user || !user.roleTag) return null;

  // Render logic based on roleTag per spec
  let content = null;
  
  switch (user.roleTag) {
    case 'video_editor':
      content = "This week: 3 reels done · 1 in review · avg reel 2h 50m (your 8-wk avg 3h 05m ✅)";
      break;
    case 'designer':
      content = "This week: 6 creatives shipped · first-pass approval 83% · 2 awaiting review";
      break;
    case 'performance_marketer':
      content = "4 campaigns active · ⚠ Antardrashti not optimized in 3d · week leads: 87";
      break;
    case 'web_developer':
    case 'developer':
      content = "2 site builds active · 1 blocked ⚠ · bug turnaround 31h ✅";
      break;
    case 'ai_developer':
      content = "Product focus this week: 91% ✅ · 2 WhatsNexus tasks open";
      break;
    case 'ops':
      content = "1 deployment this week · 0 blocked · learning hours: 3/4h";
      break;
    case 'sales':
      content = "5 follow-ups today · 2 proposals pending · next call 11:30";
      break;
    default:
      content = "This week: Focus on your high priority tasks and upcoming deadlines.";
  }

  // Determine state color (just a simple mock logic for amber/green)
  const isWarning = content.includes('⚠');
  const isGood = content.includes('✅');
  const bgClass = isWarning ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : isGood ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' : 'bg-surface-2 border-border text-text-2';

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${bgClass} hover:opacity-80`}>
      <div className="text-sm font-medium leading-tight">
        {content}
      </div>
      {['performance_marketer'].includes(user.roleTag) && (
        <button className="ml-4 shrink-0 text-xs font-bold px-3 py-1.5 rounded bg-surface text-text border border-border hover:border-primary transition">
          Log weekly numbers
        </button>
      )}
    </div>
  );
}
