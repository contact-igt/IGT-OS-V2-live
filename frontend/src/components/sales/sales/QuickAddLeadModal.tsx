'use client';
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';

interface FormState {
  contactPerson: string;
  name: string;
  phone: string;
  source: string;
  industry: string;
  stage: 'discovery' | 'proposal' | 'revision';
  monthlyValueINR: string;
  assignedTo: string;
  smm: boolean;
  perf: boolean;
  web: boolean;
  nexus: boolean;
  priceQuoted: string;
  proposalDiscussed: boolean;
  notes: string;
}

const EMPTY: FormState = {
  contactPerson: '', name: '', phone: '', source: '',
  industry: '', stage: 'discovery', monthlyValueINR: '',
  assignedTo: 'u-sushil', smm: false, perf: false, web: false, nexus: false,
  priceQuoted: '', proposalDiscussed: false, notes: '',
};

export default function QuickAddLeadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);

  const bdMembers = state.teamMembers.filter(m =>
    ['super_admin', 'admin', 'ops'].includes(m.role)
  );

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const toggle = (field: 'smm' | 'perf' | 'web' | 'nexus') => () => {
    setForm(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!form.contactPerson.trim()) errs.push('Contact name is required.');
    if (!form.name.trim()) errs.push('Company name is required.');
    if (!form.monthlyValueINR || isNaN(Number(form.monthlyValueINR))) errs.push('Potential value must be a number.');
    if (errs.length > 0) { setErrors(errs); return; }

    const today = new Date().toISOString().split('T')[0];
    const services = [
      form.smm && 'smm', form.perf && 'performance_marketing',
      form.web && 'web_development', form.nexus && 'whatsapp_automation',
    ].filter(Boolean) as string[];

    const newLead = {
      id: `L-${Date.now()}`,
      contactPerson: form.contactPerson.trim(),
      name: form.name.trim(),
      industry: form.industry || 'General',
      stage: form.stage,
      monthlyValueINR: Number(form.monthlyValueINR),
      lastContactDate: today,
      nextFollowUp: today,
      source: form.source || 'Direct',
      assignedTo: form.assignedTo,
      score: 50,
      stageHistory: [{ stage: form.stage, date: today }],
      servicesNeeded: services.length > 0 ? services : undefined,
      priceQuoted: form.priceQuoted ? Number(form.priceQuoted) : undefined,
      proposalDiscussed: form.proposalDiscussed,
    };

    dispatch({ type: 'ADD_LEAD', payload: newLead });
    setForm(EMPTY);
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  const inp = 'w-full bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors';
  const lbl = 'text-[10px] font-bold text-[var(--c-text-2)] uppercase tracking-wider block mb-1';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--c-surface)] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[var(--c-border)]">

          <div className="flex justify-between items-center p-5 border-b border-[var(--c-border)] bg-[var(--c-surface-2)] shrink-0">
            <div>
              <h2 className="font-bold text-[var(--c-text)]">Quick Add Lead</h2>
              <p className="text-xs text-[var(--c-text-2)] mt-0.5">All required fields marked *</p>
            </div>
            <button onClick={onClose} className="text-[var(--c-text-2)] hover:text-[var(--c-text)] p-1 rounded-lg hover:bg-[var(--c-surface)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto">

            {errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500 space-y-1">
                {errors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Contact Name *</label>
                <input className={inp} placeholder="e.g. Dr. Priya" value={form.contactPerson} onChange={set('contactPerson')} />
              </div>
              <div>
                <label className={lbl}>Company *</label>
                <input className={inp} placeholder="Priya Vision" value={form.name} onChange={set('name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Phone</label>
                <input type="tel" className={inp} placeholder="+91..." value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className={lbl}>Potential Value / mo (₹) *</label>
                <input type="number" className={inp} placeholder="50000" value={form.monthlyValueINR} onChange={set('monthlyValueINR')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Source</label>
                <select className={inp} value={form.source} onChange={set('source')}>
                  <option value="">Select...</option>
                  <option value="Ophthall net">Ophthall network</option>
                  <option value="Referral">Referral</option>
                  <option value="Meta ad">Meta Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold outreach">Cold Outreach</option>
                  <option value="Google ad">Google Ads</option>
                  <option value="Direct">Direct</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Industry</label>
                <select className={inp} value={form.industry} onChange={set('industry')}>
                  <option value="">Select...</option>
                  <option value="Eye care">Eye Care</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Dental">Dental</option>
                  <option value="Fitness">Fitness</option>
                  <option value="IT/HRMS">IT / SaaS</option>
                  <option value="Retail">Retail</option>
                  <option value="Education">Education</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Stage</label>
                <select className={inp} value={form.stage} onChange={set('stage') as any}>
                  <option value="discovery">Discovery</option>
                  <option value="proposal">Proposal</option>
                  <option value="revision">Revision</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Assigned To</label>
                <select className={inp} value={form.assignedTo} onChange={set('assignedTo')}>
                  {bdMembers.length > 0
                    ? bdMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                    : <><option value="u-sushil">Sushil</option><option value="u-tania">Tania</option></>
                  }
                </select>
              </div>
              <div>
                <label className={lbl}>Price Quoted (₹)</label>
                <input type="number" className={inp} placeholder="Optional" value={form.priceQuoted} onChange={set('priceQuoted')} />
              </div>
            </div>

            {/* Services */}
            <div className="border-t border-[var(--c-border)] pt-4">
              <label className={lbl + ' mb-2'}>Services Needed</label>
              <div className="flex flex-wrap gap-3">
                {([['smm', 'Social Media'], ['perf', 'Performance Mktg'], ['web', 'Website'], ['nexus', 'WhatsNexus']] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form[key]} onChange={toggle(key)} className="accent-emerald-500 w-4 h-4" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Proposal flag */}
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium select-none">
              <input type="checkbox" checked={form.proposalDiscussed} onChange={e => setForm(p => ({ ...p, proposalDiscussed: e.target.checked }))} className="accent-emerald-500 w-4 h-4" />
              Proposal formally discussed?
            </label>

            <div>
              <label className={lbl}>Notes</label>
              <textarea rows={2} className={inp} placeholder="Any initial context..." value={form.notes} onChange={set('notes')} />
            </div>

          </div>

          <div className="p-4 border-t border-[var(--c-border)] bg-[var(--c-surface-2)] flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-4 py-2 font-medium text-sm text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-6 py-2 font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors">
              Add Lead →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
