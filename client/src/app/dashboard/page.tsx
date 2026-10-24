'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { apiFetch } from '../../lib/api';
import {
  Compass,
  Trophy,
  Calendar,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Send,
  Sparkles,
  Phone,
  Shield,
  Radio,
} from 'lucide-react';
import { SendRequestModal } from '../../components/SendRequestModal';
import { PlayerProfileModal } from '../../components/PlayerProfileModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { onlineCount, isConnected } = useSocket();

  const [bestMatches, setBestMatches] = useState<any[]>([]);
  const [upcomingRequests, setUpcomingRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedPlayerForRequest, setSelectedPlayerForRequest] = useState<any | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [searchRes, reqRes] = await Promise.all([
        apiFetch<{ success: boolean; players: any[] }>('/players/search?limit=6'),
        apiFetch<{ success: boolean; requests: any[] }>('/requests'),
      ]);

      if (searchRes.success) {
        setBestMatches(searchRes.players);
      }

      if (reqRes.success) {
        const now = new Date();
        const upcoming = reqRes.requests.filter(
          (r) => r.status === 'accepted' && new Date(r.proposedDateTime) >= now
        );
        const pending = reqRes.requests.filter(
          (r) => r.status === 'pending' && r.userRoleInRequest === 'receiver'
        );

        setUpcomingRequests(upcoming);
        setPendingRequests(pending);
      }
    } catch (err: any) {
      // Ignore or notify
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  // Real-time automatic data sync on socket events
  useEffect(() => {
    const onRealtimeUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('playnear:request', onRealtimeUpdate);
    window.addEventListener('playnear:notification', onRealtimeUpdate);

    return () => {
      window.removeEventListener('playnear:request', onRealtimeUpdate);
      window.removeEventListener('playnear:notification', onRealtimeUpdate);
    };
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await apiFetch(`/requests/${requestId}/accept`, { method: 'PATCH' });
      if (res.success) {
        showToast('Request accepted! Contact info unlocked.', 'success');
        loadDashboardData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error accepting request', 'error');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await apiFetch(`/requests/${requestId}/decline`, { method: 'PATCH' });
      if (res.success) {
        showToast('Request declined', 'info');
        loadDashboardData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error declining request', 'error');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading your player dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Admin Executive Alert Banner */}
      {user.role === 'admin' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-purple-500/30">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span>Executive Platform Administrator Active</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              Manage User Accounts, Platform Moderation & Safety
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              You are signed in with master administrative authority. Access the Admin Suite to manage all registered user accounts, suspend or reactivate members, verify sports communities, and inspect platform KPIs.
            </p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-purple-50 text-purple-950 font-extrabold text-sm shadow-lg hover:scale-105 transition-all shrink-0"
          >
            <Shield className="w-4 h-4 text-purple-700" />
            Open Admin Suite →
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Active in {user.locality || 'Neighborhood'}
            </span>
            {user.role === 'admin' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                Platform Admin
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user.name}! 🏸
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {pendingRequests.length > 0
              ? `You have ${pendingRequests.length} incoming play request waiting for confirmation.`
              : 'Discover top scored recreational partners nearby and schedule a casual game.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            href="/find"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-sports text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 transition-all"
          >
            <Compass className="w-4 h-4" />
            Find Players
          </Link>
          <Link
            href="/communities"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Communities
          </Link>
        </div>
      </div>

      {/* Pending Play Requests Alert Box (if any) */}
      {pendingRequests.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border-amber-300 bg-amber-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Incoming Play Requests ({pendingRequests.length})
            </h2>
            <Link href="/requests" className="text-xs text-amber-700 hover:underline font-semibold">
              View All Requests
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-sports text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {req.sender.photo ? (
                      <img src={req.sender.photo} alt={req.sender.name} className="w-full h-full object-cover" />
                    ) : (
                      req.sender.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{req.sender.name}</h3>
                    <p className="text-xs text-slate-500">
                      Game: <strong>{req.game?.name}</strong> • {new Date(req.proposedDateTime).toLocaleDateString()} at{' '}
                      {new Date(req.proposedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {req.message && (
                      <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-lg">
                        "{req.message}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleDeclineRequest(req._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(req._id)}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg gradient-sports text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept Game
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Confirmed Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Your Upcoming Sessions
          </h2>
          <Link href="/history" className="text-xs text-emerald-600 hover:underline font-semibold">
            View Play History
          </Link>
        </div>

        {upcomingRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingRequests.map((req) => {
              const partner = req.userRoleInRequest === 'sender' ? req.receiver : req.sender;
              const dateObj = new Date(req.proposedDateTime);

              return (
                <div key={req._id} className="glass-card p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Confirmed Match
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {req.durationMinutes || 60} mins
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{req.game?.name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {req.locationType} {req.venue ? `(${req.venue})` : ''}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/50 rounded-xl space-y-1 text-xs">
                    <p className="font-semibold text-slate-800">Partner: {partner.name}</p>
                    <p className="text-emerald-900 font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {partner.contactPreference?.toUpperCase()}: {partner.contactValue || 'Unlocked'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No upcoming games scheduled</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ready for a match? Send an invitation to nearby players or join an open community game.
            </p>
            <div className="pt-2">
              <Link
                href="/find"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-sports text-white text-xs font-semibold shadow-sm"
              >
                <Compass className="w-3.5 h-3.5" />
                Find Partners Nearby
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Best Matches Carousel / Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Best Matches in Your Area
            </h2>
            <p className="text-xs text-slate-500">
              Ranked by distance, availability overlap, and skill closeness.
            </p>
          </div>
          <Link href="/find" className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1">
            View All On Map
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bestMatches.map((player) => (
            <div
              key={player.id}
              className="glass-card p-5 rounded-2xl flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl gradient-sports text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      {player.photo ? (
                        <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        player.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                        {player.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {player.locality} • {player.approximateDistance}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shadow-xs">
                    {player.matchingScore}% Match
                  </span>
                </div>

                {/* Preferred Games Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {player.games?.slice(0, 3).map((g: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {g.gameName} ({g.skillLevel})
                    </span>
                  ))}
                </div>

                {player.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    "{player.bio}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingPlayer(player)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForRequest(player)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl gradient-sports text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all"
                >
                  <Send className="w-3 h-3" />
                  Invite to Play
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <SendRequestModal
        isOpen={!!selectedPlayerForRequest}
        onClose={() => setSelectedPlayerForRequest(null)}
        targetPlayer={selectedPlayerForRequest}
        onSuccess={() => loadDashboardData()}
      />

      <PlayerProfileModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        player={viewingPlayer}
        onSendRequest={(p) => setSelectedPlayerForRequest(p)}
        onPlayerBlocked={() => loadDashboardData()}
      />
    </div>
  );
}
