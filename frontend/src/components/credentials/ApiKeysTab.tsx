'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Key, Check, X } from 'lucide-react';

interface SecretSlot {
  keyName: string;
  label: string;
  hasDbValue: boolean;
  hasEnvFallback: boolean;
  updatedAt: string | null;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ApiKeysTab() {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [slots, setSlots] = useState<SecretSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${baseUrl}/api/app-secrets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setSlots(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (keyName: string) => {
    const value = (drafts[keyName] || '').trim();
    if (!value || !token) return;
    setSavingKey(keyName);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/app-secrets/${keyName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) { setError('Failed to save key.'); return; }
      setDrafts(prev => ({ ...prev, [keyName]: '' }));
      load();
    } catch {
      setError('Failed to save key.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemove = async (keyName: string) => {
    if (!token) return;
    const ok = await confirm('Remove this key? The app will fall back to its environment variable, if one is set.', { danger: true, confirmLabel: 'Remove' });
    if (!ok) return;
    await fetch(`${baseUrl}/api/app-secrets/${keyName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  if (loading) {
    return <div className="text-[13px] text-text-3 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
        <p className="text-[13px] text-text-2">
          Keys are encrypted at rest and never shown again once saved — only whether one is configured.
          Pasting a new key takes effect immediately, no redeploy needed.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-[13px] text-red-500">{error}</div>
      )}

      <div className="space-y-4">
        {slots.map(slot => (
          <div key={slot.keyName} className="card-surface2 p-5 border border-border rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center text-primary border border-border">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[14px] text-text">{slot.label}</h3>
                  <p className="text-[11px] text-text-3 font-mono">{slot.keyName}</p>
                </div>
              </div>
              {slot.hasDbValue ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  <Check className="w-3 h-3" /> Configured
                </span>
              ) : slot.hasEnvFallback ? (
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-surface-3 text-text-2">
                  Using environment variable
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                  <X className="w-3 h-3" /> Not set
                </span>
              )}
            </div>

            {slot.hasDbValue && slot.updatedAt && (
              <p className="text-[11px] text-text-3 mb-3">
                Last updated {new Date(slot.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            <div className="flex gap-2">
              <input
                type="password"
                placeholder={slot.hasDbValue ? 'Paste a new key to replace it...' : 'Paste key...'}
                value={drafts[slot.keyName] || ''}
                onChange={e => setDrafts(prev => ({ ...prev, [slot.keyName]: e.target.value }))}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-2 text-sm outline-none focus:border-primary transition-colors font-mono"
              />
              <button
                onClick={() => handleSave(slot.keyName)}
                disabled={!drafts[slot.keyName]?.trim() || savingKey === slot.keyName}
                className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingKey === slot.keyName ? 'Saving...' : 'Save'}
              </button>
              {slot.hasDbValue && (
                <button
                  onClick={() => handleRemove(slot.keyName)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-bold text-text-2 hover:text-red-500 hover:border-red-500/30 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
