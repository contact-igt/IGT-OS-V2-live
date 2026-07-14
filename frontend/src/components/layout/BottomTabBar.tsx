'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, Clock, Bell, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function BottomTabBar() {
  const pathname = usePathname();
  const { state } = useApp();
  const currentUser = state.teamMembers.find(m => m.id === state.currentUserId);
  
  if (!currentUser || (currentUser.role !== 'team' && currentUser.role !== 'viewer')) {
    return null;
  }

  const unreadCount = state.notifications.filter(n => n.userId === state.currentUserId && !n.read).length;

  const tabs = [
    { href: '/my-workspace', icon: CheckSquare, label: 'My Tasks' },
    { href: '/my-workspace/timer', icon: Clock, label: 'Timer' },
    { href: '/my-workspace/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { href: '/my-workspace/profile', icon: User, label: 'Profile' }
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
