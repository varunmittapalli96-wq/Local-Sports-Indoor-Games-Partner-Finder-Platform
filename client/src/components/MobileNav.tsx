'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Compass, Calendar, Users, LayoutDashboard, User } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = [
    { name: 'Find', href: '/find', icon: Compass },
    { name: 'Requests', href: '/requests', icon: Calendar, requiresAuth: true },
    { name: 'Groups', href: '/communities', icon: Users },
    { name: 'Home', href: user ? '/dashboard' : '/', icon: LayoutDashboard },
    { name: 'Profile', href: user ? '/settings' : '/login', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'text-emerald-600 font-semibold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
