'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { Copy, ExternalLink, Search, Share2, ShieldCheck, X } from 'lucide-react';
import { ClientCredential } from '@/lib/data';
import ApiKeysTab from '@/components/credentials/ApiKeysTab';

export default function CredentialsPage() {
  const router = useRouter();
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'api-keys'>('clients');

  // Selection state
  const [selectedCreds, setSelectedCreds] = useState<string[]>([]);
  
  // Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [credToShare, setCredToShare] = useState<string | null>(null);

  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  const canShare = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  useEffect(() => {
    if (currentUser && (currentUser.role === 'team' || currentUser.role === 'ops')) {
      router.push('/my-workspace');
    }
  }, [currentUser, router]);

  const filteredCredentials = (state.credentials || []).filter(cred => {
    const client = state.clients.find(c => c.id === cred.clientId);
    const searchString = `${client?.name} ${cred.platform} ${cred.username}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSelection = (id: string) => {
    setSelectedCreds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleShareClick = (id?: string) => {
    if (id) {
      setCredToShare(id);
      setSelectedCreds([id]); // Select this one for sharing
    }
    setIsShareModalOpen(true);
  };

  const platformIcons: Record<string, string> = {
    instagram: 'photo_camera',
    youtube: 'play_circle',
    facebook: 'thumb_up',
    website: 'language',
    hosting: 'dns'
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[28px] font-bold flex items-center gap-2" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-syne-var)' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>key</span> Secure Credentials
        </h1>
        <div className="flex gap-3">
          {canShare && selectedCreds.length > 0 && (
            <button 
              onClick={() => handleShareClick()}
              className="px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm font-bold text-text hover:bg-surface-3 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share {selectedCreds.length} Selected
            </button>
          )}
          <button className="btn-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Credential
          </button>
        </div>
      </div>

      {canShare && (
        <div className="mb-5 flex gap-1 p-1 rounded-xl bg-surface-2 border border-border w-fit flex-shrink-0">
          {(['clients', 'api-keys'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === tab ? 'bg-surface text-text shadow-sm' : 'text-text-2 hover:text-text'
              }`}
            >
              {tab === 'clients' ? 'Client Credentials' : 'API Keys'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'api-keys' ? (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <ApiKeysTab />
        </div>
      ) : (
      <>
      <div className="mb-4 flex gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input
            type="text"
            placeholder="Search by client, platform, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-surface-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 mt-0.5">lock</span>
        <div>
          <h4 className="text-[13px] font-bold text-amber-500 uppercase tracking-wider mb-1">Secure Password Storage Coming Soon</h4>
          <p className="text-[13px] text-text-2">For security reasons, plaintext passwords have been removed from the dashboard. A secure encrypted vault is currently in development and will be available soon.</p>
        </div>
      </div>


      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {filteredCredentials.map(cred => {
            const client = state.clients.find(c => c.id === cred.clientId);
            const isSelected = selectedCreds.includes(cred.id);
            
            return (
              <div 
                key={cred.id} 
                className={`card-surface2 p-5 border transition-all duration-200 relative ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/30'}`}
              >
                {canShare && (
                  <div className="absolute top-3 left-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-primary cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleSelection(cred.id)}
                    />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary border border-border">
                      <span className="material-symbols-outlined">{platformIcons[cred.platform] || 'key'}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[14px] text-text">{client?.name || 'Unknown Client'}</h3>
                      <p className="text-[12px] text-text-3 capitalize">{cred.platform}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {cred.url && (
                      <a href={cred.url} target="_blank" rel="noreferrer" className="text-text-3 hover:text-primary transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pl-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Username</span>
                    <div className="flex items-center justify-between bg-surface p-2 rounded border border-border">
                      <span className="text-[13px] font-mono text-text">{cred.username}</span>
                      <button onClick={() => copyToClipboard(cred.username)} className="text-text-3 hover:text-primary">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {canShare && (
                  <div className="mt-4 pt-4 border-t border-border pl-6">
                    <button 
                      onClick={() => handleShareClick(cred.id)}
                      className="w-full py-1.5 flex items-center justify-center gap-2 text-xs font-bold text-text-2 hover:text-primary transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" /> Manage Access
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-text-3 hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold font-syne mb-1 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> 
              Share Access
            </h2>
            <p className="text-sm text-text-2 mb-6">
              Select team members to grant access to {selectedCreds.length} credential{selectedCreds.length > 1 ? 's' : ''}.
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
              {state.teamMembers.filter(m => m.id !== currentUser?.id).map(member => (
                <label key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2 cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-text">{member.name}</p>
                      <p className="text-xs text-text-3 capitalize">{member.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-text-2 hover:text-text"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert(`Access granted for ${selectedCreds.length} credential(s).`);
                  setIsShareModalOpen(false);
                  setSelectedCreds([]);
                }}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90"
              >
                Confirm Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
