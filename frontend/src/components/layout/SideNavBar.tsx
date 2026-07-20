'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import {
  LayoutDashboard, User, CheckSquare, CalendarDays, Briefcase,
  Users, Layers, TrendingUp, Key, History, Sparkles, Shield,
  Menu, PanelLeftClose, Zap, LogOut, Terminal, Brush, Film, LineChart,
  List, Calendar, BarChart, FileBarChart, Megaphone, Wallet, Star
} from 'lucide-react';
import { NAV_SECTIONS } from '@/lib/data';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_GROUPS = [
  { title: 'Workspace',    items: ['/dashboard', '/my-workspace', '/tasks', '/calendar', '/clients', '/my-profile'] },
  { title: 'Agency Ops',  items: ['/team', '/development', '/social'] },
  { title: 'Settings & AI', items: ['/credentials', '/audit', '/ai', '/admin'] },
];

const ICON_MAP: Record<string, React.ElementType> = {
  grid_view: LayoutDashboard, terminal: Terminal, brush: Brush,
  movie: Film, show_chart: LineChart, person: User,
  check_box: CheckSquare, view_timeline: CalendarDays, business_center: Briefcase,
  groups: Users, workspaces: Layers, trending_up: TrendingUp,
  key: Key, history_edu: History, auto_awesome: Sparkles,
  admin_panel_settings: Shield, campaign: Megaphone,
  account_balance: Wallet, point_of_sale: TrendingUp, stars: Star,
};

function SideNavBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, dispatch } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user: currentUser } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Workspace': true,
    'Agency Ops': true,
    'Settings & AI': true
  });

  const handleLogout = () => {
    if (currentUser) {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toISOString();
      const log = state.attendanceLogs.find(l => l.userId === currentUser.id && l.date === todayStr);
      if (log && !log.clockOut) {
        dispatch({
          type: 'CLOCK_OUT',
          payload: { userId: currentUser.id, date: todayStr, time: timeStr }
        });
      }
    }
    logout();
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const overdueCount = useMemo(() => state.tasks.filter(t => {
    if (!t.deadline || t.status === 'done') return false;
    return new Date(t.deadline) < new Date(new Date().toDateString());
  }).length, [state.tasks]);

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 bg-app-sidebar border-r border-app-border"
      style={{
        width: collapsed ? '64px' : '240px',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0 border-b border-app-border">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2AB182, #1A8F68)' }}>
          <Zap className="w-5 h-5 text-white" fill="currentColor" />
        </div>
        {!collapsed && (
          <span className="text-app-text font-syne font-bold text-lg tracking-tight leading-none">
            INVICTUS<br /><span className="text-[10px] tracking-[0.3em] font-medium opacity-50">OS</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="ml-auto text-app-text3 hover:text-app-text transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {(() => {
          return SIDEBAR_GROUPS.map((group, groupIdx) => {
            const groupItems = NAV_SECTIONS.filter((item) => {
              if (!currentUser) return false;
              if (!group.items.includes(item.href)) return false;
              
              const role = currentUser.role;
              const department = currentUser.department;
              const grantedPages = currentUser.grantedPages || [];
              const isGranted = grantedPages.includes(item.href);

              // Strict role-based filtering for Admin/CEO
              if (role === 'super_admin' || role === 'admin') {
                // Hide department dashboards to avoid clutter for the CEO
                const hiddenForCeo = [
                  '/dashboard/coo', '/dashboard/ops', '/dashboard/developer',
                  '/dashboard/designer', '/dashboard/video-editor', '/dashboard/marketer',
                  '/dashboard/sales', '/dashboard/team', '/dashboard/ai-developer'
                ];
                if (hiddenForCeo.includes(item.href)) return false;
                return true;
              }

              // Strict role-based filtering for COO/Ops
              if (role === 'ops') {
                const allowedForOps = [
                  '/dashboard/coo', '/dashboard/ops',
                  '/my-workspace', '/tasks', '/my-profile',
                  '/clients'
                ];
                if (!allowedForOps.includes(item.href) && !isGranted) return false;
                return true;
              }

              // Filtering for regular team members
              if (item.section === 'dashboard') return false; // Hide completely

              // General Section Filtering for team
              const allowedForTeam = ['/my-workspace', '/tasks', '/calendar', '/my-profile'];
              if (!allowedForTeam.includes(item.href) && !isGranted) return false;

              return true;
            });

            if (groupItems.length === 0) return null;

            return (
              <div key={group.title} className={groupIdx > 0 ? "mt-4" : ""}>
                {!collapsed && (
                  <div 
                    className="px-5 mb-2 flex items-center justify-between cursor-pointer group"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-app-text3 group-hover:text-app-text transition-colors">
                      {group.title}
                    </p>
                    <span 
                      className="material-symbols-outlined text-[14px] text-app-text3 group-hover:text-app-text transition-transform duration-200" 
                      style={{ transform: expandedGroups[group.title] ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    >
                      expand_more
                    </span>
                  </div>
                )}
                <div className={`transition-all duration-200 overflow-hidden ${!collapsed && !expandedGroups[group.title] ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                {groupItems.map((item) => {
                  const isActive = pathname === item.href
                    || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    || (item.href === '/team' && pathname.startsWith('/people/attendance'));
                  
                  const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard;
                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 mx-3 mb-1 rounded-lg transition-all duration-150 relative group ${isActive ? 'bg-app-surface2' : 'bg-transparent hover:bg-app-hover'}`}
                        style={{
                          padding: collapsed ? '10px 18px' : '10px 16px',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                        }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
                        )}

                        {/* Icon */}
                        <IconComponent 
                          className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-app-text3'}`} 
                        />

                        {/* Label */}
                        {!collapsed && (
                          <span className={`font-medium text-[13px] transition-colors font-grotesk ${isActive ? 'text-app-text' : 'text-app-text2'}`}>
                            {item.label}
                          </span>
                        )}

                        {/* Badge */}
                        {item.section === 'dashboard' && overdueCount > 0 && (
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-red-500 min-w-[18px] text-center"
                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            {overdueCount}
                          </span>
                        )}

                        {/* Tooltip for collapsed */}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-app-surface3 text-app-text border border-app-border">
                            {item.label}
                          </span>
                        )}
                      </Link>

                      {/* SUB NAVIGATION FOR TASKS */}
                      {item.href === '/tasks' && pathname.startsWith('/tasks') && !collapsed && (
                        <div className="flex flex-col gap-1 mx-3 mb-4 pl-10 pr-3 border-l border-app-border/30 ml-7 mt-1">
                          <Link href="/tasks?view=board" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Board</Link>
                          <Link href="/tasks?view=list" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">List</Link>
                          <Link href="/tasks?view=calendar" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Calendar</Link>
                          <Link href="/tasks?view=gantt" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Gantt chart</Link>
                        </div>
                      )}

                      {/* SUB NAVIGATION FOR TEAM */}
                      {item.href === '/team' && (pathname.startsWith('/team') || pathname.startsWith('/people/attendance')) && !collapsed && (
                        <div className="flex flex-col gap-1 mx-3 mb-4 pl-10 pr-3 border-l border-app-border/30 ml-7 mt-1">
                          <Link href="/team" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Team Overview</Link>
                          <Link href="/team/workload" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Workload</Link>
                          <Link href="/people/attendance" className="text-[12px] font-medium text-app-text2 hover:text-primary py-1">Attendance</Link>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            );
          });
        })()}
      </nav>

      {/* User section */}
      <div className="border-t border-app-border p-[12px_8px]">
        <div
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-app-hover"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#0E0E0E] font-grotesk"
            style={{ backgroundColor: 'var(--c-primary)' }}
          >
            {currentUser?.name?.substring(0, 2).toUpperCase() || '??'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-app-text text-[12px] font-semibold truncate font-grotesk">{currentUser?.name || 'Unknown'}</p>
              <p className="text-[10px] font-medium text-primary capitalize">{currentUser?.role?.replace('_', ' ') || 'User'}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-app-text3 hover:text-app-text transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function SideNavBar() {
  return (
    <Suspense fallback={<div className="w-[240px] h-full bg-app-sidebar border-r border-app-border"></div>}>
      <SideNavBarInner />
    </Suspense>
  );
}
