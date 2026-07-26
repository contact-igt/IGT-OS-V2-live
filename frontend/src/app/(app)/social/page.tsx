'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TrendingUp, Users, Eye, Search, ExternalLink } from 'lucide-react';

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  instagram_denied: 'Instagram connection was cancelled or the permissions were denied.',
  instagram_no_pages: "That Facebook account doesn't manage any Pages — Instagram must be linked to a Facebook Page you administer.",
  instagram_no_linked_account: "None of that Facebook account's Pages have a linked Instagram Business or Creator account.",
};

function SocialHubPageInner() {
  const { state, reloadData } = useApp();
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connectedPlatform = searchParams.get('connected');
    const connectedCount = searchParams.get('count');
    const connectError = searchParams.get('error');

    if (connectedPlatform) {
      const countSuffix = connectedCount ? ` (${connectedCount} account${connectedCount === '1' ? '' : 's'})` : '';
      setBanner({ type: 'success', message: `${connectedPlatform === 'instagram' ? 'Instagram' : 'YouTube'} connected successfully${countSuffix}.` });
      reloadData();
      router.replace('/social');
    } else if (connectError) {
      setBanner({ type: 'error', message: CONNECT_ERROR_MESSAGES[connectError] || `Connection failed: ${connectError}` });
      router.replace('/social');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${apiBaseUrl}/api/social/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      await reloadData();
    } catch (e) {
      console.error('Failed to sync social accounts:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAccounts = (state.socialAccounts || []).filter(account => {
    const client = state.clients.find(c => c.id === account.clientId);
    const searchString = `${account.label} ${client?.name || ''} ${account.platform}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <span className="material-symbols-outlined text-[20px]">photo_camera</span>;
      case 'youtube': return <span className="material-symbols-outlined text-[20px]">play_circle</span>;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toString();
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-full flex flex-col pb-10">
      {banner && (
        <div className={`mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium flex-shrink-0 ${
          banner.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
        }`}>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{banner.type === 'success' ? 'check_circle' : 'error'}</span>
            {banner.message}
          </span>
          <button onClick={() => setBanner(null)} className="text-current opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 flex-shrink-0 flex-wrap gap-3">
        <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>trending_up</span> Social Hub
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              type="text"
              placeholder="Search by client, account, or platform..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface-2 text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <a
            href={`${apiBaseUrl}/api/auth/instagram/connect`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors text-text"
          >
            <span className="material-symbols-outlined text-pink-500" style={{ fontSize: 18 }}>photo_camera</span> Connect Instagram
          </a>
          <a
            href={`${apiBaseUrl}/api/auth/youtube/connect`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors text-text"
          >
            <span className="material-symbols-outlined text-red-600" style={{ fontSize: 18 }}>play_circle</span> Connect YouTube
          </a>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="btn-primary flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            <span className={`material-symbols-outlined ${isSyncing ? 'animate-spin' : ''}`} style={{ fontSize: 18 }}>sync</span>
            {isSyncing ? 'Syncing...' : 'Sync All Accounts'}
          </button>
        </div>
      </div>

      <div className="flex-1 pb-8">
        {filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-3">
            <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">trending_up</span>
            <p className="text-sm font-medium">No social accounts connected yet.</p>
            <p className="text-xs mt-1">Use "Connect Instagram" or "Connect YouTube" above to link an account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map(account => {
              const client = state.clients.find(c => c.id === account.clientId);
              const isInsta = account.platform === 'instagram';
              const primaryGrowthPct = isInsta ? account.reachChange : account.viewsChange;
              const primaryGrowthVal = primaryGrowthPct != null ? parseFloat(primaryGrowthPct) : null;
              const followersGrowthAbs = account.followersGrowth30d ?? null;
              const sls = account.sinceLastSync;
              const posts = account.latestPosts || [];

              return (
                <div key={account.id} className="card-surface2 overflow-hidden flex flex-col group">
                  <div
                    className="p-5 border-b border-border flex items-start justify-between relative"
                    style={{ background: isInsta ? 'linear-gradient(135deg, rgba(225,48,108,0.1), rgba(131,58,180,0.05))' : 'linear-gradient(135deg, rgba(255,0,0,0.1), rgba(255,0,0,0.02))' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${isInsta ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' : 'bg-red-600'}`}>
                        {getPlatformIcon(account.platform)}
                      </div>
                      <div>
                        <h3 className="font-bold text-[16px] text-text">{account.label || client?.name || 'Unknown Account'}</h3>
                        <p className="text-[12px] font-semibold opacity-80 uppercase tracking-wider">{client?.name || account.platform}</p>
                      </div>
                    </div>
                    <button className="text-text-3 hover:text-primary transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {isInsta ? 'Followers' : 'Subscribers'}</span>
                      <span className="text-[24px] font-bold text-text">{formatNumber(account.followers)}</span>
                      {followersGrowthAbs !== null ? (
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${followersGrowthAbs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <span className="material-symbols-outlined text-[12px]">{followersGrowthAbs >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                          {followersGrowthAbs >= 0 ? '+' : ''}{formatNumber(followersGrowthAbs)} (30d)
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-3">30-day growth —</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {isInsta ? 'Reach' : 'Views'}</span>
                      <span className="text-[24px] font-bold text-text">{formatNumber(isInsta ? account.reach : account.views)}</span>
                      {primaryGrowthVal !== null ? (
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${primaryGrowthVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <span className="material-symbols-outlined text-[12px]">{primaryGrowthVal >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                          {primaryGrowthVal >= 0 ? '+' : ''}{primaryGrowthVal.toFixed(1)}% (30d)
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-3">30-day growth —</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 col-span-2 mt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Engagement Rate</span>
                        <span className="text-[13px] font-bold text-primary">{(account.engagementRate ?? 0).toFixed(2)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(account.engagementRate ?? 0) > 5 ? 'bg-emerald-500' : (account.engagementRate ?? 0) > 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, ((account.engagementRate ?? 0) / 10) * 100)}%` }}
                        />
                      </div>
                      {sls?.engagementRateDelta && (
                        <span className="text-[10px] text-text-3">{parseFloat(sls.engagementRateDelta) >= 0 ? '+' : ''}{sls.engagementRateDelta}% vs last sync</span>
                      )}
                    </div>

                    {!isInsta && account.watchTimeHours != null && (
                      <div className="flex flex-col gap-1 col-span-2 mt-1">
                        <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Watch Time (Hours)</span>
                        <span className="text-[16px] font-bold text-text">{formatNumber(account.watchTimeHours)}</span>
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-4 pt-3 border-t border-border flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> {isInsta ? 'Last 3 Posts' : 'Last 3 Videos'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {posts.slice(0, 3).map((post, idx) => (
                        <a
                          key={idx}
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between text-[12px] py-1.5 px-2 hover:bg-surface-3 rounded-lg transition-colors"
                        >
                          <span className="truncate max-w-[160px] text-text font-medium" title={post.title}>{idx + 1}. {post.title}</span>
                          <span className="text-[11px] font-bold text-text-3">{formatNumber(post.views)}</span>
                        </a>
                      ))}
                      {posts.length === 0 && (
                        <span className="text-[12px] text-text-3 italic pl-2">No recent posts found</span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-border bg-surface-2 mt-auto">
                    <p className="text-[10px] font-semibold text-text-3 text-center">
                      {account.lastUpdated ? `Last synced: ${new Date(account.lastUpdated).toLocaleString()}` : 'Never synced'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialHubPage() {
  return (
    <Suspense fallback={<div className="w-full h-full" />}>
      <SocialHubPageInner />
    </Suspense>
  );
}
