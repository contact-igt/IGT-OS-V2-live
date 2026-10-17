'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import SideNavBar from '@/components/layout/SideNavBar';
import TopAppBar from '@/components/layout/TopAppBar';
import BottomTabBar from '@/components/layout/BottomTabBar';

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setCurrentUser } = useApp();
  const { user, grantedPagesReady } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Close the drawer after navigating, and on Escape.
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  
  useEffect(() => {
    if (user) {
      const mockUser = state.teamMembers.find(m => m.email === user.email);
      const activeId = mockUser ? mockUser.id : user.id;
      if (state.currentUserId !== activeId) {
        setCurrentUser(activeId);
      }
    }
  }, [user, state.teamMembers, state.currentUserId, setCurrentUser]);
  
  const isTeamMember = user && (user.role === 'team' || user.role === 'viewer');
  
  // For team members on mobile, sidebar width is 0 effectively since it's hidden
  const sw = isTeamMember ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL) : (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL); // We'll handle responsive margin via CSS classes

  useEffect(() => {
    if (!user) return;
    // Wait for the granted-pages fetch to finish before deciding to redirect — otherwise
    // a user with a real grant gets bounced away for the split second before it loads.
    if (!grantedPagesReady) return;

    const grantedPages = user.grantedPages || [];
    const isGranted = grantedPages.some(p => pathname === p || pathname.startsWith(`${p}/`));

    if (user.role === 'team' || user.role === 'viewer') {
      const allowedPaths = ['/my-workspace', '/tasks', '/my-profile', '/calendar', '/meetings', '/team', '/projects'];
      const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`)) || isGranted;
      if (!isAllowed && pathname !== '/') {
        router.push('/my-workspace');
      }
    } else if (user.role === 'ops') {
      const blockedPaths = ['/admin', '/credentials', '/audit', '/ai', '/finance', '/sales', '/ad-budget', '/clients'];
      const isBlocked = blockedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`)) && !isGranted;
      if (isBlocked) {
        router.push('/dashboard');
      }
    }
  }, [pathname, user, router, grantedPagesReady]);

  return (
    <div className="h-screen overflow-hidden" style={{ background: 'var(--c-bg)', ['--sw' as string]: `${sw}px` }}>
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileNavOpen(false)} aria-hidden />
      )}
      <SideNavBar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(c => !c)} mobileOpen={mobileNavOpen} />
      <TopAppBar sidebarWidth={sw} onMenuClick={() => setMobileNavOpen(true)} />
      <main
        className={`page-enter overflow-y-auto ml-0 md:ml-[var(--sw)] p-3 md:px-8 md:py-7 transition-[margin-left] duration-300 ${isTeamMember ? 'mb-[64px] md:mb-0' : ''}`}
        style={{
          marginTop: 56,
          height: isTeamMember ? 'calc(100vh - 56px - 64px)' : 'calc(100vh - 56px)', // Adjust height on mobile for bottom bar
        }}
      >
        {state.globalError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-red-500 text-xl font-medium mb-4">API Error</div>
            <p className="text-[#888888] mb-6">{state.globalError}</p>
            <button onClick={() => window.location.reload()} className="bg-[#222222] hover:bg-[#333333] px-4 py-2 rounded-lg transition-colors">
              Retry
            </button>
          </div>
        ) : state.isGlobalLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-[#222222] rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#111111] rounded border border-[#222222]"></div>)}
            </div>
            <div className="h-64 bg-[#111111] rounded border border-[#222222]"></div>
          </div>
        ) : (
          children
        )}
      </main>
      <BottomTabBar />
    </div>
  );
}
