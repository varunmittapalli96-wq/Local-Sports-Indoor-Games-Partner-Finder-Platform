'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Trophy,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Calendar,
  ArrowRight,
  Flame,
  Radio,
  Sparkles,
  Activity,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../lib/api';

const defaultGameIcons: Record<string, string> = {
  'Badminton': '🏸',
  'Table Tennis': '🏓',
  'Chess': '♟️',
  'Carrom': '⚪',
  'Cricket (Box / Turf)': '🏏',
  'Football (Turf / Field)': '⚽',
  'Tennis': '🎾',
  'Squash': '🎯',
  'Basketball': '🏀',
  'Cards & Board Games': '🎲',
};

export default function LandingPage() {
  const { user } = useAuth();
  const { onlineCount, liveActivities: socketActivities } = useSocket();

  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch real-time database stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiFetch<{ success: boolean; stats: any }>('/stats/realtime');
        if (res.success && res.stats) {
          setRealtimeStats(res.stats);
          if (res.stats.popularGames?.length) {
            setGames(res.stats.popularGames);
          }
          if (res.stats.activities?.length) {
            setActivities(res.stats.activities);
          }
        }
      } catch (err) {
        // Fallback or retry
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Sync real-time socket events with activity stream
  useEffect(() => {
    if (socketActivities && socketActivities.length > 0) {
      setActivities((prev) => {
        const combined = [...socketActivities, ...prev];
        const unique = combined.filter((v, i, a) => a.findIndex(t => (t.id || t.timestamp) === (v.id || v.timestamp)) === i);
        return unique.slice(0, 10);
      });
    }
  }, [socketActivities]);

  const features = [
    {
      icon: Compass,
      title: 'Location & Radius Discovery',
      description: 'Discover recreational partners within walking distance (0.5 km) or quick drive (5 km) around your society or locality.',
    },
    {
      icon: Trophy,
      title: 'Weighted Match Score',
      description: 'Our proprietary algorithm pairs you based on proximity (40%), free schedule (30%), skill level (20%), and mutual games.',
    },
    {
      icon: Shield,
      title: 'Safety & Privacy First',
      description: 'Approximate distance display only, fuzzed public coordinates, and optional women-only play preferences.',
    },
    {
      icon: Calendar,
      title: 'Zero Double-Booking',
      description: 'Built-in schedule guard ensures no overlapping accepted matches. Auto-expiry prevents stale invites.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12 animate-fade-in">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span>Real-Time Matching Active • Indiranagar, Koramangala & HSR Layout</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Find nearby partners for{' '}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            sports & indoor games
          </span>{' '}
          in minutes.
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          No more dead WhatsApp groups or missing fourth players. Discover verified neighbors for badminton, chess, carrom, cricket, and table tennis at your society clubhouse or local turf.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/find"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl gradient-sports text-white font-bold text-base shadow-glow hover:opacity-95 transition-all hover:scale-[1.02]"
          >
            <Compass className="w-5 h-5" />
            Find Players Nearby
          </Link>

          {!user ? (
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-semibold text-base shadow-sm hover:bg-slate-50 hover:border-emerald-400 transition-all"
            >
              Join Platform Free
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-semibold text-base shadow-sm hover:bg-slate-50 hover:border-emerald-400 transition-all"
            >
              My Dashboard
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </Link>
          )}
        </div>

        {/* Live Metrics Row */}
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Players Registered</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {realtimeStats?.totalUsers !== undefined ? realtimeStats.totalUsers : 0}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Live</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Active Challenges</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {realtimeStats?.activeRequests !== undefined ? realtimeStats.activeRequests : 0}
              </span>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded">Live</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Matches Completed</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                {realtimeStats?.completedMatches !== undefined ? realtimeStats.completedMatches : 0}
              </span>
              <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">Verified</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Online Presence</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-600 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                {onlineCount}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Now</span>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            100% Free Casual Play
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            No Phone Number Exposed Before Acceptance
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Women-Only Safety Guard
          </span>
        </div>
      </section>

      {/* Featured Games Grid with Real-Time Database Counts */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Live Player Availability Across Bengaluru
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Popular Games in Your Locality
          </h2>
          <p className="text-sm text-slate-500">Choose your game, view nearby players, and propose a session.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {(games.length > 0 ? games : [
            { name: 'Badminton', category: 'indoor', playerCount: 0, countDisplay: '0 active players' },
            { name: 'Chess', category: 'indoor', playerCount: 0, countDisplay: '0 active players' },
            { name: 'Table Tennis', category: 'indoor', playerCount: 0, countDisplay: '0 active players' },
            { name: 'Carrom', category: 'indoor', playerCount: 0, countDisplay: '0 active players' },
            { name: 'Cricket (Box / Turf)', category: 'outdoor', playerCount: 0, countDisplay: '0 active players' },
          ]).slice(0, 10).map((g, idx) => {
            const iconEmoji = defaultGameIcons[g.name] || '🏆';
            const playerCountNum = g.playerCount || 0;
            return (
              <Link
                key={g._id || idx}
                href={`/find?game=${encodeURIComponent(g.name)}`}
                className="glass-card p-4 rounded-2xl text-center space-y-2 group block hover:border-emerald-300 transition-all hover:shadow-md"
              >
                <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                  {iconEmoji}
                </div>
                <h3 className="font-bold text-slate-800 text-sm truncate">{g.name}</h3>
                <p className="text-[11px] text-slate-400 capitalize">{g.category || 'Casual'}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {playerCountNum} {playerCountNum === 1 ? 'active player' : 'active players'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Real-Time Live Activity Feed Section */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4 animate-pulse text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Live Community Recreation Stream
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                  REALTIME
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Recent partner requests, accepted games, and new members connecting in real-time.
              </p>
            </div>
          </div>
          <Link
            href="/find"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Join Next Match <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {activities.length > 0 ? (
            activities.slice(0, 6).map((act, i) => (
              <div
                key={act.id || i}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5 flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Flame className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {act.title || act.action?.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {act.description || act.meta?.game || 'Casual recreation session'}
                  </p>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {act.timestamp || act.createdAt ? new Date(act.timestamp || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-6 text-center text-xs text-slate-400">
              No play activity recorded yet. Register and invite a neighbor to get started!
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="glass-panel p-8 sm:p-12 rounded-3xl space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Simple 3-Step Flow</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How PlayNear Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="space-y-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl gradient-sports flex items-center justify-center text-white text-lg font-bold shadow-glow mx-auto sm:mx-0">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">Set Preferences & Schedule</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pick the games you love (Badminton, Chess, Carrom, Cricket), your skill level, and free time slots (evenings or weekend mornings).
            </p>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl gradient-sports flex items-center justify-center text-white text-lg font-bold shadow-glow mx-auto sm:mx-0">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Get Smart-Matched Nearby</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our 0–100 matching engine ranks players around you by distance, skill closeness, and availability. Explore on a live interactive map.
            </p>
          </div>

          <div className="space-y-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl gradient-sports flex items-center justify-center text-white text-lg font-bold shadow-glow mx-auto sm:mx-0">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Send Invite & Play</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Propose a date, time, and location (Clubhouse or Ground). When accepted, contact details unlock so you can meet and enjoy the game!
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Designed for Safe Community Recreation</h2>
          <p className="text-sm text-slate-500">Built to replace noisy messaging groups with respectful, organized sports discovery.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="glass-card p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Community Groups Callout */}
      <section className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            For Society & Apartment Clubhouses
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Create an exclusive sports group for your residential society.
          </h2>
          <p className="text-sm text-emerald-100/80 leading-relaxed">
            Society sports secretaries and clubhouse organizers can schedule recurring weekly badminton/chess sessions, post open play slots, and verify neighborhood residents.
          </p>
          <div className="pt-2">
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-lg"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              Explore Community Hubs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
