'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import {
  Calendar,
  Clock,
  MapPin,
  Trophy,
  CheckCircle2,
  Check,
  Ban,
  ArrowRight,
  Flame,
} from 'lucide-react';

export default function PlayHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [timeframe, setTimeframe] = useState<'all' | 'past' | 'upcoming'>('all');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setLoading(true);
      const query = timeframe === 'all' ? '' : `?timeframe=${timeframe}`;
      apiFetch<{ success: boolean; history: any[] }>(`/history${query}`)
        .then((res) => {
          if (res.success) {
            setHistory(res.history);
          }
        })
        .catch((err) => {
          showToast(err.message || 'Error fetching history', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, timeframe, router, showToast]);

  const completedCount = history.filter((h) => h.status === 'completed').length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-emerald-600" />
            Play History & Engagement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your past recreational sessions, matches, and upcoming meetups.
          </p>
        </div>

        {/* Timeframe switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
          {(['all', 'upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3.5 py-1.5 rounded-lg capitalize transition-all ${
                timeframe === t ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Completed Games</span>
            <p className="text-xl font-extrabold text-slate-900">{completedCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Sessions Logged</span>
            <p className="text-xl font-extrabold text-slate-900">{history.length}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Player Reliability</span>
            <p className="text-xl font-extrabold text-emerald-600">100%</p>
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading play history...</div>
        ) : history.length > 0 ? (
          history.map((item) => {
            const partner = item.sender._id === user?._id ? item.receiver : item.sender;
            const dateObj = new Date(item.proposedDateTime);

            return (
              <div
                key={item._id}
                className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl gradient-sports text-white font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {partner.photo ? (
                      <img src={partner.photo} alt={partner.name} className="w-full h-full object-cover" />
                    ) : (
                      partner.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {item.game?.name} with {partner.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span>•</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.locationType} {item.venue ? `(${item.venue})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      item.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'accepted'
                        ? 'bg-blue-100 text-blue-800'
                        : item.status === 'declined'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No play history recorded yet</h3>
            <p className="text-xs text-slate-500">
              Complete your first session with a neighbor to start building your play streak!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
