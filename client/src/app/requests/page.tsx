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
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Filter,
  Check,
  Ban,
} from 'lucide-react';

export default function RequestsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Completion modal state
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [noShowReported, setNoShowReported] = useState(false);
  const [noShowReason, setNoShowReason] = useState('Partner did not arrive at venue');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('box', activeTab);
      if (statusFilter) params.append('status', statusFilter);

      const res = await apiFetch<{ success: boolean; requests: any[] }>(
        `/requests?${params.toString()}`
      );
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading requests', 'error');
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
      loadRequests();
    }
  }, [user, authLoading, activeTab, statusFilter]);

  // Real-time automatic data sync on socket request events
  useEffect(() => {
    const onRealtimeRequest = () => {
      loadRequests();
    };

    window.addEventListener('playnear:request', onRealtimeRequest);
    return () => {
      window.removeEventListener('playnear:request', onRealtimeRequest);
    };
  }, [activeTab, statusFilter]);

  const handleAccept = async (id: string) => {
    try {
      const res = await apiFetch(`/requests/${id}/accept`, { method: 'PATCH' });
      if (res.success) {
        showToast('Play request accepted! Partner contact revealed.', 'success');
        loadRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      const res = await apiFetch(`/requests/${id}/decline`, { method: 'PATCH' });
      if (res.success) {
        showToast('Request declined', 'info');
        loadRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to decline request', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this play session?')) return;
    try {
      const res = await apiFetch(`/requests/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Schedule conflict' }),
      });
      if (res.success) {
        showToast('Play request cancelled', 'info');
        loadRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel request', 'error');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRequestId) return;

    try {
      const res = await apiFetch(`/requests/${completingRequestId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({
          noShowReported,
          noShowReason: noShowReported ? noShowReason : undefined,
        }),
      });

      if (res.success) {
        showToast('Session recorded as completed! Thank you for playing.', 'success');
        setCompletingRequestId(null);
        setNoShowReported(false);
        loadRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to mark session complete', 'error');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accepted
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Pending Response
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'declined':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600" />
            Play Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review invites from neighbors, coordinate match details, and track confirmations.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'received'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Received Invites
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sent'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sent by You
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </span>
        {['', 'pending', 'accepted', 'completed', 'declined', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all ${
              statusFilter === st
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st || 'All Statuses'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading requests...</div>
        ) : requests.length > 0 ? (
          requests.map((req) => {
            const isReceiver = req.userRoleInRequest === 'receiver';
            const partner = isReceiver ? req.sender : req.receiver;
            const dateObj = new Date(req.proposedDateTime);
            const isAccepted = req.status === 'accepted';
            const isCompleted = req.status === 'completed';

            return (
              <div
                key={req._id}
                className="glass-card p-5 sm:p-6 rounded-3xl space-y-4 border border-slate-200/90 shadow-xs"
              >
                {/* Top Row: Partner, Game, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl gradient-sports text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      {partner.photo ? (
                        <img src={partner.photo} alt={partner.name} className="w-full h-full object-cover" />
                      ) : (
                        partner.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {isReceiver ? `Invite from ${partner.name}` : `Sent to ${partner.name}`}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {partner.locality} • Game: <strong className="text-slate-800">{req.game?.name}</strong>
                      </p>
                    </div>
                  </div>

                  <div>{statusBadge(req.status)}</div>
                </div>

                {/* Session Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({req.durationMinutes || 60} mins)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="capitalize">
                      {req.locationType} {req.venue ? `(${req.venue})` : ''}
                    </span>
                  </div>
                </div>

                {/* Message */}
                {req.message && (
                  <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-100">
                    "{req.message}"
                  </p>
                )}

                {/* UNLOCKED CONTACT BANNER (Revealed on Acceptance) */}
                {(isAccepted || isCompleted) && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="space-y-0.5">
                      <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-700">
                        Unlocked Partner Contact
                      </span>
                      <p className="text-sm font-bold flex items-center gap-2">
                        {partner.contactPreference === 'whatsapp' ? (
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        ) : partner.contactPreference === 'phone' ? (
                          <Phone className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Mail className="w-4 h-4 text-emerald-600" />
                        )}
                        {partner.contactPreference?.toUpperCase()}:{' '}
                        <span className="text-slate-900">{partner.contactValue}</span>
                      </p>
                    </div>

                    {partner.contactPreference === 'whatsapp' && partner.contactValue && (
                      <a
                        href={`https://wa.me/${partner.contactValue.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat on WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {/* Receiver Pending Actions */}
                  {isReceiver && req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleDecline(req._id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(req._id)}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl gradient-sports text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept & Reveal Contact
                      </button>
                    </>
                  )}

                  {/* Cancel Action (if pending or accepted) */}
                  {(req.status === 'pending' || req.status === 'accepted') && (
                    <button
                      onClick={() => handleCancel(req._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel Session
                    </button>
                  )}

                  {/* Mark Complete Action (if accepted) */}
                  {req.status === 'accepted' && (
                    <button
                      onClick={() => setCompletingRequestId(req._id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Mark Completed / Record Result
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No requests found in this box</h3>
            <p className="text-xs text-slate-500">
              When you invite someone or a neighbor invites you to play, sessions will appear here.
            </p>
            <div className="pt-2">
              <Link
                href="/find"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-sports text-white text-xs font-bold shadow-sm"
              >
                Find Players Nearby
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Completion & No-Show Modal */}
      {completingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleComplete}
            className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 max-w-md w-full space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">Mark Play Session Completed</h3>
            <p className="text-xs text-slate-500">
              Confirm that you and your partner met for the game. This feeds your active engagement stats.
            </p>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={noShowReported}
                onChange={(e) => setNoShowReported(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="font-semibold text-red-700">Report No-Show (Partner did not arrive)</span>
            </label>

            {noShowReported && (
              <div className="space-y-1 animate-fade-in">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Reason for No-Show
                </label>
                <input
                  type="text"
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingRequestId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 gradient-sports text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Confirm Completion
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
