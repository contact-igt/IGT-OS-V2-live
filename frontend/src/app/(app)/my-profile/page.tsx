'use client';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { User, Phone, Briefcase, Calendar, Clock, Star, Activity, Plus, FileText, CheckCircle, TrendingUp, Layers, PenTool, LayoutDashboard, MonitorPlay, Film, Code, Bug, Zap, Target, BarChart3, TrendingDown, Users, Search } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  score: number;
  hoursThisWeekMinutes: number;
  hoursThisWeekTargetMinutes: number;
  avgWorkMinutesPerActiveDay: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

const RoleSpecificMetrics = ({ department, metrics, metricsLoading }: { department: string; metrics: PerformanceMetrics | null; metricsLoading: boolean }) => {
  switch (department) {
    case 'leadership':
    case 'operations':
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-app-text2">Agency Health Score</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">98%</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-app-text2">Active Clients</span>
            </div>
            <div className="text-sm font-bold text-app-text">14</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-app-text2">Strategic Initiatives</span>
            </div>
            <div className="text-sm font-bold text-app-text">7/10 Completed</div>
          </div>
        </div>
      );
    
    case 'design':
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PenTool className="w-5 h-5 text-pink-500" />
              <span className="text-sm font-medium text-app-text2">Designs Delivered</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">34</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-app-text2">Avg Turnaround</span>
            </div>
            <div className="text-sm font-bold text-app-text">1.2 Days</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-app-text2">Creative Score</span>
            </div>
            <div className="text-sm font-bold text-app-text">9.8/10</div>
          </div>
        </div>
      );

    case 'video':
    case 'video_editor':
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-app-text2">Videos Exported</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">124</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MonitorPlay className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-medium text-app-text2">Minutes Edited</span>
            </div>
            <div className="text-sm font-bold text-app-text">840 mins</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-app-text2">Client Approval Rate</span>
            </div>
            <div className="text-sm font-bold text-app-text">96%</div>
          </div>
        </div>
      );

    case 'development':
    case 'web_developer':
    case 'ai_developer':
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-app-text2">Story Points</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">156</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-app-text2">Code Quality</span>
            </div>
            <div className="text-sm font-bold text-app-text">A+</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bug className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-app-text2">Bugs Fixed</span>
            </div>
            <div className="text-sm font-bold text-app-text">42</div>
          </div>
        </div>
      );

    case 'performance_marketing':
    case 'seo':
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium text-app-text2">Avg ROAS</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">3.8x</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-app-text2">Active Campaigns</span>
            </div>
            <div className="text-sm font-bold text-app-text">18</div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-app-text2">Ranking Improvements</span>
            </div>
            <div className="text-sm font-bold text-app-text">+45 Positions</div>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-4">
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-app-text2">Current Score</span>
            </div>
            <div className="text-xl font-bold font-syne text-app-text">
              {metricsLoading ? '—' : metrics ? `${metrics.score.toFixed(1)}/10` : 'N/A'}
            </div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-app-text2">Avg Work Time</span>
            </div>
            <div className="text-sm font-bold text-app-text">
              {metricsLoading ? '—' : metrics ? formatMinutes(metrics.avgWorkMinutesPerActiveDay) : 'N/A'}
            </div>
          </div>
          <div className="bg-app-surface2 border border-app-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-app-text2">Hours This Week</span>
            </div>
            <div className="text-sm font-bold text-app-text">
              {metricsLoading ? '—' : metrics ? `${(metrics.hoursThisWeekMinutes / 60).toFixed(1)} / ${metrics.hoursThisWeekTargetMinutes / 60}` : 'N/A'}
            </div>
          </div>
        </div>
      );
  }
};

export default function MyProfilePage() {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    emergencyContact: ''
  });
  const [leaveState, setLeaveState] = useState({ type: 'sick', fromDate: '', toDate: '', reason: '' });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('invictus_jwt');
    setMetricsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/analytics/me/performance`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setPerformanceMetrics(data))
      .catch(err => console.error('Failed to load performance metrics:', err))
      .finally(() => setMetricsLoading(false));
  }, [user?.id]);

  const handleLeaveSubmit = async () => {
    try {
      const token = localStorage.getItem('invictus_jwt');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...leaveState, requestedByName: user?.name })
      });
      alert('Leave requested successfully');
      setLeaveState({ type: 'sick', fromDate: '', toDate: '', reason: '' });
    } catch (e) {
      alert('Failed to request leave');
    }
  };

  const currentUser = state.teamMembers.find(m => m.id === user?.id || (user?.email && m.email === user.email));

  // Initialize form data when currentUser is loaded
  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        phoneNumber: currentUser.phoneNumber || '',
        emergencyContact: currentUser.emergencyContact || ''
      });
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-app-text2 font-syne">
        User profile not found.
      </div>
    );
  }

  const handleSave = () => {
    // In a real app, this would make an API call to update the user
    // For now we'll just update the local state context
    dispatch({
      type: 'UPDATE_TEAM_MEMBER',
      payload: {
        id: currentUser.id,
        updates: {
          phoneNumber: formData.phoneNumber,
          emergencyContact: formData.emergencyContact
        }
      }
    });
    setIsEditing(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-syne tracking-tight text-app-text">My Profile</h1>
          <p className="text-app-text2 mt-2 font-grotesk">Manage your personal and employment information.</p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-app-surface2 hover:bg-app-hover text-app-text px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-app-border"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditing(false)}
              className="bg-app-surface2 hover:bg-app-hover text-app-text px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-app-border"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold transition-colors text-sm"
            >
              Save Changes
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Personal & Employment Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
            <h2 className="text-lg font-bold font-syne mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Personal Details
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Full Name</label>
                <div className="text-app-text font-medium">{currentUser.name}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Email</label>
                <div className="text-app-text font-medium">{currentUser.email}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Phone Number</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full bg-app-surface2 border border-app-border rounded px-3 py-1.5 text-sm text-app-text outline-none focus:border-primary"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="text-app-text font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-app-text2" />
                    {currentUser.phoneNumber || 'Not provided'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Emergency Contact</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    className="w-full bg-app-surface2 border border-app-border rounded px-3 py-1.5 text-sm text-app-text outline-none focus:border-primary"
                    placeholder="Enter emergency contact"
                  />
                ) : (
                  <div className="text-app-text font-medium text-red-400">
                    {currentUser.emergencyContact || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-app-surface border border-app-border rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <h2 className="text-lg font-bold font-syne mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" /> Employment Details
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Employee ID</label>
                <div className="text-app-text font-medium">{currentUser.employeeId || 'N/A'}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Role / Title</label>
                <div className="text-app-text font-medium capitalize">
                  {currentUser.title || currentUser.role.replace('_', ' ')}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Department</label>
                <div className="text-app-text font-medium">{currentUser.department}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-app-text3 uppercase tracking-wider mb-1 block">Date Joined</label>
                <div className="text-app-text font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-app-text2" />
                  {currentUser.dateJoined || 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Performance & Leaves */}
        <div className="space-y-6">
          <div className="bg-app-surface border border-app-border rounded-xl p-6">
            <h2 className="text-lg font-bold font-syne mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Performance & Metrics
            </h2>
            
            <RoleSpecificMetrics department={currentUser.department || ''} metrics={performanceMetrics} metricsLoading={metricsLoading} />
          </div>

          {/* Leave Request Form */}
          <div className="bg-app-surface border border-app-border rounded-xl p-6">
            <h2 className="text-lg font-bold font-syne mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" /> Leave Balance & Request
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-app-surface2 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold font-syne text-app-text mb-1">
                  {currentUser.leavesAvailable || 0}
                </div>
                <div className="text-[10px] font-bold text-app-text3 uppercase tracking-wider">Available</div>
              </div>
              <div className="bg-app-surface2 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold font-syne text-app-text mb-1">
                  {currentUser.leavesTaken || 0}
                </div>
                <div className="text-[10px] font-bold text-app-text3 uppercase tracking-wider">Taken</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-app-border">
              <h3 className="text-sm font-bold text-app-text2">Request Leave</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-app-text3 mb-1 block">From</label>
                  <input type="date" className="w-full bg-app-surface2 border border-app-border rounded px-3 py-2 text-sm text-app-text"
                    value={leaveState.fromDate} onChange={e => setLeaveState({...leaveState, fromDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-app-text3 mb-1 block">To</label>
                  <input type="date" className="w-full bg-app-surface2 border border-app-border rounded px-3 py-2 text-sm text-app-text"
                    value={leaveState.toDate} onChange={e => setLeaveState({...leaveState, toDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs text-app-text3 mb-1 block">Reason</label>
                <input type="text" placeholder="e.g. Medical, Vacation" className="w-full bg-app-surface2 border border-app-border rounded px-3 py-2 text-sm text-app-text"
                  value={leaveState.reason} onChange={e => setLeaveState({...leaveState, reason: e.target.value})} />
              </div>
              <button onClick={handleLeaveSubmit} className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg py-2.5 px-4 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Submit Request
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
