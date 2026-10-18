'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trophy, Mail, Lock, LogIn, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      showToast('Welcome back to PlayNear!', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Invalid email or password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    showToast(`Autofilled demo credentials for ${demoEmail}`, 'info');
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl gradient-sports flex items-center justify-center text-white mx-auto shadow-glow">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to PlayNear
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Sign in to find game partners and manage your play requests.
        </p>
      </div>

      {/* Quick Demo Credentials Box */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>One-Click Demo Credentials (Instant Test)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleDemoFill('admin@playnear.com', 'AdminPass123!')}
            className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100/50 transition-colors text-left"
          >
            🛡️ Admin User
            <span className="block text-[10px] font-normal text-slate-500">Full platform controls</span>
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill('organizer@playnear.com', 'OrgPass123!')}
            className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100/50 transition-colors text-left"
          >
            🏢 Community Org
            <span className="block text-[10px] font-normal text-slate-500">Prestige Sports Club</span>
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill('user1@playnear.com', 'UserPass123!')}
            className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100/50 transition-colors text-left"
          >
            🏸 Player: Aarav
            <span className="block text-[10px] font-normal text-slate-500">Indiranagar</span>
          </button>
          <button
            type="button"
            onClick={() => handleDemoFill('user2@playnear.com', 'UserPass123!')}
            className="p-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100/50 transition-colors text-left"
          >
            ♟️ Player: Ananya
            <span className="block text-[10px] font-normal text-slate-500">Koramangala</span>
          </button>
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 disabled:opacity-50 transition-all"
        >
          <LogIn className="w-4 h-4" />
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-xs text-slate-500 pt-2">
          Don't have an account yet?{' '}
          <Link href="/register" className="text-emerald-600 hover:underline font-bold">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
