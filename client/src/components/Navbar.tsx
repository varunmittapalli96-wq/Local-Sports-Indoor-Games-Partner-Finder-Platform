'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../lib/api';
import {
  Compass,
  Calendar,
  Users,
  LayoutDashboard,
  Bell,
  ShieldCheck,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Trophy,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, onlineCount, unreadNotificationsCount, setUnreadNotificationsCount } = useSocket();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Fetch initial unread count on login
  useEffect(() => {
    if (!user) return;
    apiFetch<{ success: boolean; unreadCount: number }>('/notifications')
      .then((res) => {
        if (res.success && typeof res.unreadCount === 'number') {
          setUnreadNotificationsCount(res.unreadCount);
        }
      })
      .catch(() => {});
  }, [user, setUnreadNotificationsCount]);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    router.push('/');
  };

  const navLinks = [
    { name: 'Find Players', href: '/find', icon: Compass },
    { name: 'Play Requests', href: '/requests', icon: Calendar, requiresAuth: true },
    { name: 'Communities', href: '/communities', icon: Users },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiresAuth: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl gradient-sports flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
              Play<span className="text-emerald-600">Near</span>
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest -mt-1 hidden sm:block">
              Sports & Games Partner Finder
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            if (link.requiresAuth && !user) return null;
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & User Dropdown */}
        <div className="flex items-center gap-3">
          {/* Live Platform Presence Indicator */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{onlineCount} {onlineCount === 1 ? 'Player' : 'Players'} Online</span>
          </div>

          {user ? (
            <>
              {/* Notifications Bell */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-full hover:ring-2 hover:ring-emerald-400/40 transition-all text-left"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full gradient-sports flex items-center justify-center text-white text-xs font-semibold overflow-hidden border border-emerald-400">
                    {user.photo ? (
                      <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col">
                    <span className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
                    <span className="text-[11px] text-slate-500 leading-none">{user.locality || 'Player'}</span>
                  </div>
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-fade-in"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                          Platform Admin
                        </span>
                      )}
                    </div>

                    <Link
                      href="/onboarding"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Edit Profile & Preferences
                    </Link>

                    <Link
                      href="/history"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Play History
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Safety & Settings
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-purple-700 bg-purple-50/50 hover:bg-purple-100/70 font-medium transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-slate-100/70 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-sports hover:opacity-95 shadow-sm hover:shadow-glow transition-all"
              >
                Join Free
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 animate-fade-in">
          {navLinks.map((link) => {
            if (link.requiresAuth && !user) return null;
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {link.name}
              </Link>
            );
          })}

          {user && user.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-purple-700 bg-purple-50"
            >
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              Admin Dashboard
            </Link>
          )}

          {!user && (
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white gradient-sports shadow-sm"
              >
                Join Free
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
