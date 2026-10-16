'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, KanbanSquare, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function BottomTabBar() {
  const pathname = usePathname();
  const { state } = useApp();
  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  
  if (!currentUser || (currentUser.role !== 'team' && currentUser.role !== 'viewer')) {
    return null;
  }

  // Only routes that exist: the previous Timer/Alerts/Profile hrefs under /my-workspace/* 404'd.
  // Notifications live in the top-bar popover.
  const tabs: { href: string; icon: typeof User; label: string; badge?: number }[] = [
    { href: '/my-workspace', icon: CheckSquare, label: 'My Tasks' },
    { href: '/tasks', icon: KanbanSquare, label: 'Board' },
    { href: '/my-profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full h-[64px] bg-app-surface border-t border-app-border z-50 flex items-center justify-around pb-safe">
      {tabs.map(tab => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link 
            key={tab.href}
            href={tab.href} 
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-app-text2 hover:text-app-text'}`}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {tab.badge ? (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
