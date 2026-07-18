'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const getRouteForRole = (role: string, department: string) => {
    if (role === 'admin' || role === 'super_admin') return '/dashboard';
    if (role === 'ops') return '/dashboard';
    // For team members (like video editor, design, etc), we only want them to go to their workspace
    // as per the new RBAC rules.
    if (role === 'team') return '/my-workspace';
    
    // Fallbacks just in case
    if (department === 'design') return '/designer-dashboard';
    if (department === 'video' || department === 'video_editor') return '/editor-dashboard';
    if (department === 'development' || department === 'web_developer' || department === 'ai_developer') return '/developer-dashboard';
    if (department === 'performance_marketing' || department === 'sales') return '/sales-dashboard';
    return '/team-dashboard';
  };

  useEffect(() => {
    if (loading) return;

    if (user) {
      const route = getRouteForRole(user.role, user.department || '');
      router.replace(route);
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-8 items-center justify-center">
      <div className="animate-pulse text-app-text2">Loading your workspace...</div>
    </div>
  );
}
