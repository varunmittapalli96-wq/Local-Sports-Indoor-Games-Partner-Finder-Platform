'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { apiFetch } from '../../../lib/api';
import {
  Users,
  MapPin,
  Calendar,
  Clock,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Send,
  X,
  Trophy,
  ArrowLeft,
} from 'lucide-react';

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const communityId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Open Play Post modal
  const [openPostModal, setOpenPostModal] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [spotsNeeded, setSpotsNeeded] = useState(2);
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        community: any;
        openPosts: any[];
        recurringSessions: any[];
      }>(`/communities/${communityId}`);

      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading community details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();

    // Pre-fetch games for open post modal
    apiFetch<{ success: boolean; games: any[] }>('/games')
      .then((res) => {
        if (res.success && res.games.length > 0) {
          setGames(res.games);
          setSelectedGameId(res.games[0]._id);
        }
      })
      .catch(() => {});
  }, [communityId]);

  const handleJoinCommunity = async () => {
    if (!user) {
      showToast('Please log in to join this community', 'info');
      return;
    }

    try {
      const res = await apiFetch(`/communities/${communityId}/join`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      if (res.success) {
        showToast('You are now a member of this community!', 'success');
        loadCommunity();
      }
    } catch (err: any) {
      showToast(err.message || 'Error joining community', 'error');
    }
  };

  const handleJoinOpenPost = async (postId: string) => {
    if (!user) {
      showToast('Please log in to join this game session', 'info');
      return;
    }

    try {
      const res = await apiFetch(`/communities/${communityId}/open-posts/${postId}/join`, {
        method: 'POST',
      });

      if (res.success) {
        showToast('Joined game session successfully!', 'success');
        loadCommunity();
      }
    } catch (err: any) {
      showToast(err.message || 'Error joining open session', 'error');
    }
  };

  const handleCreateOpenPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPost(true);
    try {
      const res = await apiFetch(`/communities/${communityId}/open-posts`, {
        method: 'POST',
        body: JSON.stringify({
          gameId: selectedGameId,
          dateTime: new Date(dateTime).toISOString(),
          spotsNeeded,
          venue,
          description,
        }),
      });

      if (res.success) {
        showToast('Open play session posted to community feed!', 'success');
        setOpenPostModal(false);
        loadCommunity();
      }
    } catch (err: any) {
      showToast(err.message || 'Error posting open session', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading community hub...</div>;
  }

  if (!data || !data.community) {
    return (
      <div className="py-20 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Community not found</h2>
        <Link href="/communities" className="text-xs text-emerald-600 font-bold hover:underline">
          Return to Communities Directory
        </Link>
      </div>
    );
  }

  const { community, openPosts, recurringSessions } = data;
  const isMember = user && community.members?.some((m: any) => m.user?._id === user.id || m.user === user.id);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <Link
        href="/communities"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Communities
      </Link>

      {/* Community Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0 shadow-sm">
            {community.logo ? (
              <img src={community.logo} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              community.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{community.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {community.locality}
              </span>
              <span>•</span>
              <span className="capitalize">{community.type}</span>
              <span>•</span>
              <span>{community.members?.length || 1} members</span>
            </p>
            {community.description && (
              <p className="text-xs text-slate-600 pt-1 leading-relaxed max-w-xl">
                {community.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMember ? (
            <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Member of this Hub
            </span>
          ) : (
            <button
              onClick={handleJoinCommunity}
              className="px-6 py-2.5 rounded-xl gradient-sports text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 transition-all"
            >
              Join Community Hub
            </button>
          )}

          {isMember && (
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDateTime(`${tomorrow.toISOString().split('T')[0]}T18:00`);
                setVenue(`${community.name} Clubhouse`);
                setOpenPostModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post Open Play Slot
            </button>
          )}
        </div>
      </div>

      {/* Rules Notice */}
      {community.rules && (
        <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
          <span>
            <strong>Clubhouse Rules:</strong> {community.rules}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-500">
            INVITE CODE: {community.inviteCode}
          </span>
        </div>
      )}

      {/* Section 1: Open Play Feed ("Need 2 more for badminton today") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Open Play Requests ({openPosts.length})
          </h2>
          <span className="text-xs text-slate-500">Join upcoming community pickup games</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openPosts.length > 0 ? (
            openPosts.map((post: any) => {
              const dateObj = new Date(post.dateTime);
              const spotsLeft = (post.spotsNeeded || 2) - ((post.participants?.length || 1) - 1);
              const alreadyJoined = user && post.participants?.some((p: any) => p._id === user.id || p === user.id);

              return (
                <div key={post._id} className="glass-card p-5 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{post.game?.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        spotsLeft > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {spotsLeft > 0 ? `Need ${spotsLeft} more` : 'Session Full'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{post.description || 'Looking for fellow members for a casual game!'}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Venue: <strong>{post.venue}</strong>
                    </span>

                    {alreadyJoined ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Joined
                      </span>
                    ) : spotsLeft > 0 ? (
                      <button
                        onClick={() => handleJoinOpenPost(post._id)}
                        className="px-4 py-1.5 gradient-sports text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95"
                      >
                        Join Game
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full glass-card p-8 text-center text-xs text-slate-500">
              No open play requests right now. Be the first to invite members!
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Recurring Weekly Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Recurring Weekly Club Sessions ({recurringSessions.length})
          </h2>
          <span className="text-xs text-slate-500">Permanent community schedule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recurringSessions.map((rec: any) => (
            <div key={rec._id} className="glass-card p-5 rounded-2xl space-y-2 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Weekly Every {rec.dayOfWeek}
              </span>
              <h3 className="font-bold text-slate-900 text-base">{rec.game?.name}</h3>
              <p className="text-xs text-slate-600">
                Time: <strong>{rec.time}</strong> • Venue: {rec.venue}
              </p>
              <div className="pt-2 text-xs text-slate-500 font-medium flex items-center justify-between">
                <span>Max {rec.maxParticipants || 8} players</span>
                <span className="text-emerald-700 font-bold">{rec.participants?.length || 1} RSVP'd</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Open Play Post Modal */}
      {openPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateOpenPost}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Post Open Play Request</h3>
              <button
                type="button"
                onClick={() => setOpenPostModal(false)}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Game</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                required
              >
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Spots Needed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={spotsNeeded}
                  onChange={(e) => setSpotsNeeded(parseInt(e.target.value, 10))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Venue</label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Description / Note
              </label>
              <textarea
                placeholder="e.g. Need 2 more for intermediate doubles badminton!"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setOpenPostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPost}
                className="px-5 py-2 gradient-sports text-white text-xs font-bold rounded-xl shadow-sm"
              >
                {submittingPost ? 'Posting...' : 'Post to Feed'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
