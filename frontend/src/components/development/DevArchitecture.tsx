'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Sparkles, Upload, Download, Trash2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  FRONTEND_STACKS, BACKEND_STACKS, DATABASES,
  generateArchitecturePrompts,
  type FrontendStack, type BackendStack, type DatabaseId,
} from '@/lib/architectureTemplates';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function PromptOutput({ title, text }: { title: string; text: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>{title}</h3>
        <button
          onClick={handleCopy}
          disabled={!text}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="flex-1 p-4 text-xs leading-relaxed overflow-auto whitespace-pre-wrap"
        style={{ color: text ? 'var(--c-text-2)' : 'var(--c-text-3)', fontFamily: 'var(--font-mono, monospace)', minHeight: 280 }}
      >
        {text || 'Fill in the form and click Generate to see the prompt here.'}
      </pre>
    </div>
  );
}

type DocMeta = { docType: 'frontend' | 'backend'; filename: string; uploadedBy: string | null; updatedAt: string };

function DocCard({
  docType, title, meta, isAdmin, onUploaded, onDeleted,
}: {
  docType: 'frontend' | 'backend';
  title: string;
  meta: DocMeta | undefined;
  isAdmin: boolean;
  onUploaded: () => void;
  onDeleted: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('invictus_jwt')}` });

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.md')) {
      setError('Only .md files are accepted.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const content = await file.text();
      const res = await fetch(`${API_BASE}/api/architecture-docs/${docType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ filename: file.name, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      onUploaded();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/architecture-docs/${docType}/download`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meta?.filename || `${docType}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete the ${title} doc? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/architecture-docs/${docType}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 flex flex-col gap-3" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
      <h3 className="font-semibold" style={{ color: 'var(--c-text)' }}>{title} Documentation</h3>

      {meta ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--c-surface-2)' }}>
          <FileText size={18} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--c-text)' }}>{meta.filename}</div>
            <div className="text-[11px]" style={{ color: 'var(--c-text-3)' }}>
              Updated {new Date(meta.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm px-3 py-2.5 rounded-lg" style={{ color: 'var(--c-text-3)', backgroundColor: 'var(--c-surface-2)' }}>
          No file uploaded yet.
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        {meta && (
          <button
            onClick={handleDownload}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
          >
            <Download size={14} /> Download
          </button>
        )}
        {isAdmin && (
          <>
            <input ref={fileInputRef} type="file" accept=".md" onChange={handleFileChosen} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-40"
              style={{ borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
            >
              <Upload size={14} /> {meta ? 'Replace' : 'Upload'} .md
            </button>
            {meta && (
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 text-red-500"
                style={{ borderColor: 'rgba(239,68,68,0.4)' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DevArchitecture() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [docs, setDocs] = useState<Record<string, DocMeta>>({});
  const loadDocs = useCallback(() => {
    fetch(`${API_BASE}/api/architecture-docs`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('invictus_jwt')}` },
    })
      .then(res => res.ok ? res.json() : {})
      .then(setDocs)
      .catch(err => console.error('Failed to load architecture docs:', err));
  }, []);
  useEffect(() => { loadDocs(); }, [loadDocs]);

  const [projectName, setProjectName] = useState('');
  const [frontendStack, setFrontendStack] = useState<FrontendStack>('nextjs');
  const [backendStack, setBackendStack] = useState<BackendStack>('express');
  const [database, setDatabase] = useState<DatabaseId>('postgres');
  const [generated, setGenerated] = useState<{ frontend: string; backend: string } | null>(null);

  const handleGenerate = () => {
    setGenerated(generateArchitecturePrompts({ projectName, frontendStack, backendStack, database }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Uploaded docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocCard docType="frontend" title="Frontend" meta={docs.frontend} isAdmin={isAdmin} onUploaded={loadDocs} onDeleted={loadDocs} />
        <DocCard docType="backend" title="Backend" meta={docs.backend} isAdmin={isAdmin} onUploaded={loadDocs} onDeleted={loadDocs} />
      </div>

      {/* Project Name */}
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="e.g. Sarva-Siddhi-Peedam"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-primary transition-colors"
          style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface-2)', color: 'var(--c-text)' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frontend Panel */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Frontend</h3>
          <div className="flex flex-col gap-2">
            {FRONTEND_STACKS.map(s => (
              <label
                key={s.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  borderColor: frontendStack === s.id ? 'var(--c-primary)' : 'var(--c-border)',
                  backgroundColor: frontendStack === s.id ? 'rgba(42,177,130,0.08)' : 'var(--c-surface-2)',
                }}
              >
                <input
                  type="radio"
                  name="frontendStack"
                  checked={frontendStack === s.id}
                  onChange={() => setFrontendStack(s.id)}
                  className="accent-primary"
                />
                <span className="text-sm" style={{ color: 'var(--c-text)' }}>{s.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Backend Panel */}
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--c-text)' }}>Backend</h3>
          <div className="flex flex-col gap-2 mb-5">
            {BACKEND_STACKS.map(s => (
              <label
                key={s.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  borderColor: backendStack === s.id ? 'var(--c-primary)' : 'var(--c-border)',
                  backgroundColor: backendStack === s.id ? 'rgba(42,177,130,0.08)' : 'var(--c-surface-2)',
                }}
              >
                <input
                  type="radio"
                  name="backendStack"
                  checked={backendStack === s.id}
                  onChange={() => setBackendStack(s.id)}
                  className="accent-primary"
                />
                <span className="text-sm" style={{ color: 'var(--c-text)' }}>{s.label}</span>
              </label>
            ))}
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-2)' }}>
            Database
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DATABASES.map(d => (
              <label
                key={d.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  borderColor: database === d.id ? 'var(--c-primary)' : 'var(--c-border)',
                  backgroundColor: database === d.id ? 'rgba(42,177,130,0.08)' : 'var(--c-surface-2)',
                }}
              >
                {/* Rendered as a checkbox but behaves single-select — checking one unchecks the rest,
                    since a project's primary database is one choice, not several. */}
                <input
                  type="checkbox"
                  checked={database === d.id}
                  onChange={() => setDatabase(d.id)}
                  className="accent-primary"
                />
                <span className="text-sm" style={{ color: 'var(--c-text)' }}>{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleGenerate} className="btn-primary self-start flex items-center gap-2">
        <Sparkles size={16} />
        Generate Prompt
      </button>

      {/* Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PromptOutput title="Frontend Prompt" text={generated?.frontend ?? null} />
        <PromptOutput title="Backend Prompt" text={generated?.backend ?? null} />
      </div>
    </div>
  );
}
