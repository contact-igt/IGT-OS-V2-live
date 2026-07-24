'use client';

import { useApp } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamMember, RoleTag, NAV_SECTIONS, parseHexColor } from '@/lib/data';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  ops: 'Operations',
  team: 'Team Lead',
  member: 'Team Member',
};

// The real backend user_role / user_department enums (Postgres) — distinct from the
// cosmetic-only ROLE_LABELS/roleTag above, which only drive the local mock display and
// aren't accepted by POST /api/users.
const REAL_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ops: 'Operations',
  team: 'Team',
  viewer: 'Viewer',
};
const REAL_DEPARTMENT_LABELS: Record<string, string> = {
  bd: 'Business Development',
  operations: 'Operations',
  design: 'Design',
  development: 'Development',
  video: 'Video',
  performance_marketing: 'Performance Marketing',
  sales: 'Sales',
};

const FEATURE_PERMISSIONS = [
  { id: 'clients', label: 'Manage Clients' },
  { id: 'budget', label: 'Approve Budgets' },
  { id: 'reports', label: 'View Reports' },
  { id: 'billing', label: 'Access Billing' },
];

interface ApiKeyIntegration {
  id: string;
  type: 'api_key' | 'webhook';
  service: string;
  client: string;
  value: string;
  addedAt: string;
}

export default function AdminPage() {
  const { state, updateTeamMember, addTeamMember, reloadData } = useApp();
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKeyIntegration[]>([
    { id: '1', type: 'api_key', service: 'AI', client: 'Global', value: 'sk-ant-api03-xxxxxxxxxxx', addedAt: '2026-07-01' },
    { id: '2', type: 'webhook', service: 'Meta Ads', client: 'Pixel Eye', value: 'https://hooks.slack.com/services/...', addedAt: '2026-07-10' }
  ]);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [newKeyType, setNewKeyType] = useState<'api_key' | 'webhook'>('api_key');
  const [newKeyService, setNewKeyService] = useState('SMM');
  const [newKeyClient, setNewKeyClient] = useState('Global');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('team'); // real backend user_role
  const [newDepartment, setNewDepartment] = useState('development'); // real backend user_department
  const [newRoleTag, setNewRoleTag] = useState<RoleTag>('designer');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const router = useRouter();

  useEffect(() => {
    const user = state.teamMembers.find(m => m.id === state.currentUserId);
    if (user && user.role !== 'super_admin' && user.role !== 'admin') {
      if (user.role === 'team' || user.role === 'member') {
        router.push('/team-dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [state.currentUserId, state.teamMembers, router]);

  const handleResetPassword = async (member: TeamMember) => {
    setActionMenuOpen(null);
    try {
      const token = localStorage.getItem('invictus_jwt');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const rosterRes = await fetch(`${baseUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const roster = await rosterRes.json();
      const realUser = roster.find((u: any) => u.email?.toLowerCase() === member.email?.toLowerCase());
      if (!realUser) {
        alert(`Could not find a real backend account for ${member.name} (${member.email}).`);
        return;
      }
      const res = await fetch(`${baseUrl}/api/users/${realUser.id}/admin-reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to reset password');
        return;
      }
      alert(`Password reset for ${member.name}. New temporary password: ${data.tempPassword}\n\nThey'll be required to change it on next login. Share it securely.`);
    } catch (err) {
      alert('Could not connect to the server.');
    }
  };

  const [isPageAccessModalOpen, setIsPageAccessModalOpen] = useState(false);
  const [pageAccessMember, setPageAccessMember] = useState<TeamMember | null>(null);
  const [pageAccessRealUserId, setPageAccessRealUserId] = useState<string | null>(null);
  const [pageAccessChecked, setPageAccessChecked] = useState<Record<string, boolean>>({});
  const [pageAccessLoading, setPageAccessLoading] = useState(false);
  const [pageAccessSaving, setPageAccessSaving] = useState(false);
  const [pageAccessError, setPageAccessError] = useState('');

  const openPageAccessModal = async (member: TeamMember) => {
    setActionMenuOpen(null);
    setPageAccessMember(member);
    setPageAccessRealUserId(null);
    setPageAccessError('');
    setPageAccessChecked({});
    setPageAccessLoading(true);
    setIsPageAccessModalOpen(true);
    try {
      const token = localStorage.getItem('invictus_jwt');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const rosterRes = await fetch(`${baseUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      const roster = await rosterRes.json();
      const realUser = roster.find((u: any) => u.email?.toLowerCase() === member.email?.toLowerCase());
      if (!realUser) {
        setPageAccessError(`Could not find a real backend account for ${member.name} (${member.email}).`);
        return;
      }
      setPageAccessRealUserId(realUser.id);
      const res = await fetch(`${baseUrl}/api/page-access/${realUser.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        const checked: Record<string, boolean> = {};
        (data.pages || []).forEach((p: string) => { checked[p] = true; });
        setPageAccessChecked(checked);
      }
    } catch (err) {
      setPageAccessError('Could not connect to the server.');
    } finally {
      setPageAccessLoading(false);
    }
  };

  const handleSavePageAccess = async () => {
    if (!pageAccessRealUserId) return;
    setPageAccessSaving(true);
    setPageAccessError('');
    try {
      const token = localStorage.getItem('invictus_jwt');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const pages = Object.entries(pageAccessChecked).filter(([, v]) => v).map(([k]) => k);
      const res = await fetch(`${baseUrl}/api/page-access/${pageAccessRealUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPageAccessError(data.error || 'Failed to save');
        return;
      }
      setIsPageAccessModalOpen(false);
    } catch (err) {
      setPageAccessError('Could not connect to the server.');
    } finally {
      setPageAccessSaving(false);
    }
  };

  const handleBlockAccess = (member: TeamMember) => {
    alert(`${member.name}'s access has been temporarily blocked.`);
    setActionMenuOpen(null);
  };

  const handleRoleChange = (id: string, newRole: TeamMember['role']) => {
    updateTeamMember(id, { role: newRole });
  };

  const handleColorChange = async (id: string, newColor: string) => {
    updateTeamMember(id, { color: newColor });
    try {
      const token = localStorage.getItem('invictus_jwt');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const member = state.teamMembers.find(m => m.id === id);
      if (member?.email) {
        const rosterRes = await fetch(`${baseUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
        const roster = await rosterRes.json();
        const realUser = roster.find((u: any) => u.email?.toLowerCase() === member.email?.toLowerCase());
        if (realUser) {
          await fetch(`${baseUrl}/api/users/${realUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ color: newColor }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to sync color to database:', err);
    }
  };

  const togglePermission = (member: TeamMember, permId: string) => {
    const current = member.permissions || [];
    const updated = current.includes(permId)
      ? current.filter(p => p !== permId)
      : [...current, permId];
    updateTeamMember(member.id, { permissions: updated });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    setIsCreatingUser(true);
    setAddUserError('');

    try {
      const token = localStorage.getItem('invictus_jwt');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole, department: newDepartment }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddUserError(data.error || 'Failed to create user');
        return;
      }

      // Local mock roster gets the same person for this admin's own immediate view —
      // state.teamMembers is a static mock array other sessions won't see this in until
      // it's refetched from the backend for real (a separate, pre-existing limitation).
      const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      addTeamMember({
        name: newName,
        email: newEmail,
        role: newRole as TeamMember['role'],
        department: newDepartment,
        initials,
        color: newColor,
        hoursThisWeek: 0,
        weeklyTarget: 40,
        permissions: [],
        monthlySalaryINR: 50000,
        roleTag: newRoleTag,
        password: data.tempPassword,
      });

      alert(`User created! Temporary Password: ${data.tempPassword}\n\nThis is the real login for ${newEmail} — share it securely.`);
      reloadData();
      setIsAddUserModalOpen(false);
      setNewName('');
      setNewEmail('');
    } catch (err) {
      setAddUserError('Could not connect to the server.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue) return;
    const newIntegration: ApiKeyIntegration = {
      id: Math.random().toString(36).substring(7),
      type: newKeyType,
      service: newKeyService,
      client: newKeyClient,
      value: newKeyValue,
      addedAt: new Date().toISOString().split('T')[0],
    };
    setApiKeys([...apiKeys, newIntegration]);
    setIsAddKeyModalOpen(false);
    setNewKeyValue('');
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      setApiKeys(apiKeys.filter(k => k.id !== id));
    }
  };

  return (
    <div className="flex flex-col gap-8 relative pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-text font-syne flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 36 }}>admin_panel_settings</span>
            Admin Panel
          </h2>
          <p className="text-text-2 mt-1">Manage users, access levels, and integrations.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
          Add User
        </button>
      </div>

      <div className="card-surface2 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <h3 className="font-bold text-text">Team Members & Access Control</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">User</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Role</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Color</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Permissions</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.teamMembers.map(member => (
                <tr key={member.id} className="border-b border-border hover:bg-hover transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ background: member.color }}>
                        {member.initials}
                      </div>
                      <div>
                        <div className="font-bold text-text text-[13px]">{member.name}</div>
                        <div className="text-[11px] text-text-2">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      className="input-base text-[12px] py-1.5 w-[140px]"
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as TeamMember['role'])}
                      disabled={member.role === 'super_admin'} // Prevent changing super admin
                    >
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={parseHexColor(member.color)}
                        onChange={(e) => handleColorChange(member.id, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-[12px] font-mono text-text-2">{parseHexColor(member.color)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2 max-w-[200px]">
                      {FEATURE_PERMISSIONS.map(perm => {
                        const hasPerm = member.permissions?.includes(perm.id) || member.role === 'admin';
                        return (
                          <label key={perm.id} className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={member.role === 'admin'}
                              onChange={() => togglePermission(member, perm.id)}
                              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 bg-surface disabled:opacity-50"
                            />
                            <span className="text-[11px] font-medium text-text-2 group-hover:text-text transition-colors disabled:opacity-50">
                              {perm.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-4 text-right relative">
                    <button 
                      className="text-text-3 hover:text-primary transition-colors p-2" 
                      title="Actions"
                      onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                    
                    {actionMenuOpen === member.id && (
                      <div className="absolute right-8 top-10 w-48 bg-surface-2 border border-border rounded-lg shadow-xl py-1 z-50 text-left">
                        <button className="w-full px-4 py-2 text-[12px] text-text hover:bg-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">edit</span> Edit User
                        </button>
                        <button
                          className="w-full px-4 py-2 text-[12px] text-text hover:bg-surface flex items-center gap-2"
                          onClick={() => handleResetPassword(member)}
                        >
                          <span className="material-symbols-outlined text-[16px]">key</span> Reset Password
                        </button>
                        <button
                          className="w-full px-4 py-2 text-[12px] text-text hover:bg-surface flex items-center gap-2"
                          onClick={() => openPageAccessModal(member)}
                        >
                          <span className="material-symbols-outlined text-[16px]">shield_lock</span> Manage Page Access
                        </button>
                        <div className="h-px bg-border my-1"></div>
                        <button 
                          className="w-full px-4 py-2 text-[12px] text-red-500 hover:bg-surface flex items-center gap-2"
                          onClick={() => handleBlockAccess(member)}
                        >
                          <span className="material-symbols-outlined text-[16px]">block</span> Block Access
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-surface2 border border-border rounded-xl overflow-hidden flex flex-col mt-4">
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>key</span>
              API Keys & Webhooks
            </h3>
            <p className="text-[12px] text-text-2 mt-1">Manage integrations for SMM, Developers, Ads & AI.</p>
          </div>
          <button className="btn-secondary text-[12px] py-1.5" onClick={() => setIsAddKeyModalOpen(true)}>
            <span className="material-symbols-outlined text-[16px]">add</span> Add Integration
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Service</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Type</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Client / Scope</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Value</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Added</th>
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-3 text-[13px]">
                    No integrations added yet.
                  </td>
                </tr>
              ) : apiKeys.map(key => (
                <tr key={key.id} className="border-b border-border hover:bg-hover transition-colors">
                  <td className="p-4 font-bold text-text text-[13px]">{key.service}</td>
                  <td className="p-4">
                    <span className="bg-surface border border-border text-[10px] font-bold px-2 py-1 rounded text-text-2 uppercase tracking-wider">
                      {key.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-[13px] text-text-2">{key.client}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-surface px-2 py-1 rounded text-text-2 text-[12px] min-w-[80px]">
                        {revealedPasswords[key.id] ? key.value : '••••••••••••••••'}
                      </code>
                      <button 
                        onClick={() => togglePasswordVisibility(key.id)}
                        className="text-text-3 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {revealedPasswords[key.id] ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-[12px] text-text-2">{key.addedAt}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-red-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                      title="Delete Integration"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-2 border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
              <h3 className="font-bold text-[16px] text-text flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                Add Team Member
              </h3>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-text-3 hover:text-text transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Full Name</label>
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Email Address</label>
                <input 
                  type="email" 
                  className="input-base" 
                  placeholder="e.g. john@agency.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Role</label>
                  <select
                    className="input-base"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                  >
                    {Object.entries(REAL_ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Department</label>
                  <select
                    className="input-base"
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                  >
                    {Object.entries(REAL_DEPARTMENT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">System Role Tag <span className="normal-case font-normal text-text-3">(cosmetic only)</span></label>
                <select
                  className="input-base"
                  value={newRoleTag}
                  onChange={e => setNewRoleTag(e.target.value as RoleTag)}
                >
                  <option value="editor">Editor</option>
                  <option value="designer">Designer</option>
                  <option value="performance_marketer">Perf. Marketer</option>
                  <option value="web_developer">Web Developer</option>
                  <option value="videographer">Videographer</option>
                  <option value="ai_developer">AI Developer</option>
                  <option value="developer">Developer</option>
                  <option value="pm">Project Manager</option>
                </select>
              </div>

              {addUserError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                  <p className="text-[12px] text-text-2 leading-relaxed">{addUserError}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-[12px] font-mono text-text-2">{newColor}</span>
                </div>
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3 mt-2">
                <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                <p className="text-[12px] text-text-2 leading-relaxed">
                  A secure, 12-character password will be automatically generated. You can view or reset it from the user list later.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary disabled:opacity-60" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isAddKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-2 border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
              <h3 className="font-bold text-[16px] text-text flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">key</span>
                Add Integration
              </h3>
              <button 
                onClick={() => setIsAddKeyModalOpen(false)}
                className="text-text-3 hover:text-text transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddKey} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Integration Type</label>
                <select 
                  className="input-base"
                  value={newKeyType}
                  onChange={e => setNewKeyType(e.target.value as 'api_key' | 'webhook')}
                >
                  <option value="api_key">API Key</option>
                  <option value="webhook">Webhook URL</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Service</label>
                <select 
                  className="input-base"
                  value={newKeyService}
                  onChange={e => setNewKeyService(e.target.value)}
                >
                  <option value="SMM">Social Media Management (SMM)</option>
                  <option value="Developers">Developer Tools (GitHub, Vercel)</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="AI">AI (OpenAI, Anthropic)</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Client / Scope</label>
                <input 
                  type="text" 
                  className="input-base" 
                  placeholder="e.g. Pixel Eye or Global"
                  value={newKeyClient}
                  onChange={e => setNewKeyClient(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Key / Webhook Value</label>
                <input 
                  type="password" 
                  className="input-base font-mono text-[12px]" 
                  placeholder={newKeyType === 'api_key' ? "sk-..." : "https://..."}
                  value={newKeyValue}
                  onChange={e => setNewKeyValue(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddKeyModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Integration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPageAccessModalOpen && pageAccessMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-2 border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
              <h3 className="font-bold text-[16px] text-text flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">shield_lock</span>
                Page Access — {pageAccessMember.name}
              </h3>
              <button
                onClick={() => setIsPageAccessModalOpen(false)}
                className="text-text-3 hover:text-text transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <p className="text-[12px] text-text-2">
                Grant extra pages beyond what {pageAccessMember.name.split(' ')[0]}'s role normally allows. Unchecking a page only removes an explicit grant — it never takes away access their role already gives them.
              </p>

              {pageAccessLoading ? (
                <p className="text-[12px] text-text-3 text-center py-4">Loading…</p>
              ) : pageAccessError && !pageAccessRealUserId ? (
                <p className="text-[12px] text-red-400">{pageAccessError}</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {NAV_SECTIONS.map(section => (
                    <label key={section.href} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!pageAccessChecked[section.href]}
                        onChange={e => setPageAccessChecked(prev => ({ ...prev, [section.href]: e.target.checked }))}
                        className="rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-[13px] text-text">{section.label}</span>
                      <span className="text-[10px] text-text-3 font-mono ml-auto">{section.href}</span>
                    </label>
                  ))}
                </div>
              )}

              {pageAccessError && pageAccessRealUserId && <p className="text-[11px] text-red-400">{pageAccessError}</p>}

              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setIsPageAccessModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePageAccess}
                  disabled={pageAccessSaving || pageAccessLoading || !pageAccessRealUserId}
                  className="btn-primary disabled:opacity-60"
                >
                  {pageAccessSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
