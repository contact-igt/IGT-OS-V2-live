import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface PreviewBannerProps {
  roleName: string;
  userName: string;
}

export function PreviewBanner({ roleName, userName }: PreviewBannerProps) {
  const { user } = useAuth();
  
  // If the logged in user is the one for this dashboard, don't show the preview banner
  if (user && (user.name === userName || user.email === userName)) {
    return null;
  }
  
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-center text-sm">
      <span className="text-amber-600 font-medium mr-2">🔒 Preview Mode —</span>
      <span className="text-[var(--c-text-2)]">
        Showing <strong>{roleName}</strong> dashboard data.
      </span>
      <span className="mx-2 text-[var(--c-border)]">|</span>
      <Link href="/login" className="text-[var(--c-primary)] font-semibold hover:underline">
        Log in as {userName} to see your personalized view
      </Link>
    </div>
  );
}
