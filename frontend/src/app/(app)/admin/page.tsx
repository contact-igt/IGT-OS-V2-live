'use client';

import { useApp } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamMember, RoleTag } from '@/lib/data';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  ops: 'Operations',
  team: 'Team Lead',
  member: 'Team Member',
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

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function AdminPage() {
  const { state, updateTeamMember, addTeamMember } = useApp();
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
  const [newRole, setNewRole] = useState<TeamMember['role']>('member');
  const [newDepartment, setNewDepartment] = useState('Design');
  const [newRoleTag, setNewRoleTag] = useState<RoleTag>('designer');
  const [newColor, setNewColor] = useState('#3B82F6');

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

  const handleResetPassword = (member: TeamMember) => {
    const newPassword = generatePassword();
    updateTeamMember(member.id, { password: newPassword });
    alert(`Password reset for ${member.name}. New password: ${newPassword}`);
    setActionMenuOpen(null);
  };

  const handleBlockAccess = (member: TeamMember) => {
    alert(`${member.name}'s access has been temporarily blocked.`);
    setActionMenuOpen(null);
  };

  const handleRoleChange = (id: string, newRole: TeamMember['role']) => {
    updateTeamMember(id, { role: newRole });
  };

  const handleColorChange = (id: string, newColor: string) => {
    updateTeamMember(id, { color: newColor });
  };

  const togglePermission = (member: TeamMember, permId: string) => {
    const current = member.permissions || [];
    const updated = current.includes(permId)
      ? current.filter(p => p !== permId)
      : [...current, permId];
    updateTeamMember(member.id, { permissions: updated });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const password = generatePassword();
    
    addTeamMember({
      name: newName,
      email: newEmail,
      role: newRole,
      department: newDepartment,
      initials,
      color: newColor,
      hoursThisWeek: 0,
      weeklyTarget: 40,
      permissions: [],
      monthlySalaryINR: 50000,
      roleTag: newRoleTag,
      password,
    });

    alert(`User created! Temporary Password: ${password}`);
    setIsAddUserModalOpen(false);
    setNewName('');
    setNewEmail('');
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
    <div className="flex flex-col h-full gap-8 relative pb-10">
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
                <th className="p-4 text-[11px] font-bold text-text-3 uppercase tracking-wider">Password</th>
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
                      disabled={member.id === 'u1'} // Prevent changing super admin
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
                        value={member.color || '#3B82F6'}
                        onChange={(e) => handleColorChange(member.id, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-[12px] font-mono text-text-2">{member.color || '#3B82F6'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-surface px-2 py-1 rounded text-text-2 text-[12px] min-w-[80px]">
                        {revealedPasswords[member.id] ? (member.password || 'not set') : '••••••••'}
                      </code>
                      <button 
                        onClick={() => togglePasswordVisibility(member.id)}
                        className="text-text-3 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {revealedPasswords[member.id] ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
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
                  <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">Designation</label>
                  <select 
                    className="input-base"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as TeamMember['role'])}
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-text-3">System Role Tag</label>
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
              </div>

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
                <button type="submit" className="btn-primary">
                  Create User
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
    </div>
  );
}
