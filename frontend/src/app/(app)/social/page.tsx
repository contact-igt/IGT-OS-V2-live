'use client';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TrendingUp, Users, Eye, Search, ExternalLink } from 'lucide-react';

export default function SocialHubPage() {
  const { state } = useApp();
  const [search, setSearch] = useState('');

  const filteredMetrics = (state.socialMetrics || []).filter(metric => {
    const client = state.clients.find(c => c.id === metric.clientId);
    const searchString = `${client?.name} ${metric.platform}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'instagram': return <span className="material-symbols-outlined text-[20px]">photo_camera</span>;
      case 'youtube': return <span className="material-symbols-outlined text-[20px]">play_circle</span>;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-full flex flex-col pb-10">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>trending_up</span> Social Hub
        </h1>
        <button className="btn-primary flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sync</span> Sync All Accounts
        </button>
      </div>

      <div className="mb-6 flex gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input 
            type="text"
            placeholder="Search by client or platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-surface-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map(metric => {
            const client = state.clients.find(c => c.id === metric.clientId);
            const isInsta = metric.platform === 'instagram';
            
            return (
              <div key={metric.id} className="card-surface2 overflow-hidden flex flex-col group">
                {/* Header */}
                <div 
                  className="p-5 border-b border-border flex items-start justify-between relative"
                  style={{ background: isInsta ? 'linear-gradient(135deg, rgba(225,48,108,0.1), rgba(131,58,180,0.05))' : 'linear-gradient(135deg, rgba(255,0,0,0.1), rgba(255,0,0,0.02))' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${isInsta ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' : 'bg-red-600'}`}
                    >
                      {getPlatformIcon(metric.platform)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[16px] text-text">{client?.name || 'Unknown Client'}</h3>
                      <p className="text-[12px] font-semibold opacity-80 uppercase tracking-wider">{metric.platform}</p>
                    </div>
                  </div>
                  <button className="text-text-3 hover:text-primary transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Followers</span>
                    <span className="text-[24px] font-bold text-text">{formatNumber(metric.followers)}</span>
                    <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> 2.4%</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {isInsta ? 'Reach' : 'Views'}</span>
                    <span className="text-[24px] font-bold text-text">{formatNumber(isInsta ? metric.reach : (metric.views || 0))}</span>
                    <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> 5.1%</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 col-span-2 mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Engagement Rate</span>
                      <span className="text-[13px] font-bold text-primary">{metric.engagementRate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${metric.engagementRate > 5 ? 'bg-emerald-500' : metric.engagementRate > 3 ? 'bg-amber-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min(100, (metric.engagementRate / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {!isInsta && metric.watchTimeHours && (
                    <div className="flex flex-col gap-1 col-span-2 mt-1">
                      <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Watch Time (Hours)</span>
                      <span className="text-[16px] font-bold text-text">{formatNumber(metric.watchTimeHours)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border bg-surface-2 mt-auto">
                  <p className="text-[10px] font-semibold text-text-3 text-center">Last synced: {new Date(metric.lastUpdated).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
