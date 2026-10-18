'use client';

import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { apiFetch } from '../../lib/api';
import {
  ShieldCheck,
  Users,
  Trophy,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Search,
  Filter,
  Flame,
  Clock,
  Sparkles,
  MapPin,
  Radio,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { isConnected, onlineCount } = useSocket();

  const [activeTab, setActiveTab] = useState<'kpis' | 'users' | 'communities' | 'games' | 'reports' | 'logs'>('kpis');

  // KPI Data
  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  // Users data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Communities data
  const [communitiesList, setCommunitiesList] = useState<any[]>([]);

  // Games data
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [newGameCategory, setNewGameCategory] = useState<'indoor' | 'outdoor'>('indoor');

  // Reports data
  const [reportsList, setReportsList] = useState<any[]>([]);

  // Activity logs
  const [logsList, setLogsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // Load KPI data
  const loadKpis = async () => {
    try {
      const res = await apiFetch('/admin/kpis');
      if (res.success) {
        setKpis(res.kpis);
        setCharts(res.charts);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading admin KPIs', 'error');
    }
  };

  // Load Users data
  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      if (userStatusFilter) params.append('status', userStatusFilter);
      const res = await apiFetch(`/admin/users?${params.toString()}`);
      if (res.success) setUsersList(res.users);
    } catch {}
  };

  // Load Communities
  const loadCommunities = async () => {
    try {
      const res = await apiFetch('/admin/communities');
      if (res.success) setCommunitiesList(res.communities);
    } catch {}
  };

  // Load Games
  const loadGames = async () => {
    try {
      const res = await apiFetch('/games');
      if (res.success) setGamesList(res.games);
    } catch {}
  };

  // Load Reports
  const loadReports = async () => {
    try {
      const res = await apiFetch('/admin/reports');
      if (res.success) setReportsList(res.reports);
    } catch {}
  };

  // Load Logs
  const loadLogs = async () => {
    try {
      const res = await apiFetch('/admin/activity-log');
      if (res.success) setLogsList(res.logs);
    } catch {}
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        showToast('Access denied: Admin credentials required', 'error');
        router.push('/dashboard');
        return;
      }

      setLoading(true);
      Promise.all([loadKpis(), loadUsers(), loadCommunities(), loadGames(), loadReports(), loadLogs()]).finally(
        () => setLoading(false)
      );
    }
  }, [user, authLoading]);

  // Real-time automatic data sync on socket events
  useEffect(() => {
    const handleAdminActivity = (e: any) => {
      if (e.detail) {
        setLogsList((prev) => [
          {
            _id: e.detail.id || Date.now().toString(),
            action: e.detail.action,
            entity: e.detail.entity,
            actorEmail: e.detail.actorEmail || 'System',
            meta: e.detail.meta,
            createdAt: e.detail.timestamp || new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      loadKpis();
    };

    const handleReportAlert = () => {
      loadReports();
      loadKpis();
    };

    const handleUserUpdate = () => {
      loadUsers();
      loadKpis();
    };

    const handleRequestUpdate = () => {
      loadKpis();
    };

    window.addEventListener('playnear:admin_activity', handleAdminActivity);
    window.addEventListener('playnear:activity', handleAdminActivity);
    window.addEventListener('playnear:admin_report', handleReportAlert);
    window.addEventListener('playnear:admin_user_update', handleUserUpdate);
    window.addEventListener('playnear:request', handleRequestUpdate);

    return () => {
      window.removeEventListener('playnear:admin_activity', handleAdminActivity);
      window.removeEventListener('playnear:activity', handleAdminActivity);
      window.removeEventListener('playnear:admin_report', handleReportAlert);
      window.removeEventListener('playnear:admin_user_update', handleUserUpdate);
      window.removeEventListener('playnear:request', handleRequestUpdate);
    };
  }, []);

  // Actions
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        showToast(`User status updated to ${nextStatus}`, 'success');
        loadUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating user status', 'error');
    }
  };

  const handleVerifyCommunity = async (commId: string, status: 'verified' | 'rejected') => {
    try {
      const res = await apiFetch(`/admin/communities/${commId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        showToast(`Community group marked as ${status}`, 'success');
        loadCommunities();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating community', 'error');
    }
  };

  const handleCreateGame = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          name: newGameName,
          category: newGameCategory,
          minPlayers: 2,
          maxPlayers: 4,
        }),
      });
      if (res.success) {
        showToast('Game category created!', 'success');
        setNewGameName('');
        loadGames();
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating game', 'error');
    }
  };

  const handleResolveReport = async (reportId: string, suspendUser: boolean) => {
    try {
      const res = await apiFetch(`/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'reviewed',
          adminNote: suspendUser ? 'Action taken: User suspended' : 'Reviewed and dismissed',
          suspendUser,
        }),
      });
      if (res.success) {
        showToast('Report handled successfully', 'success');
        loadReports();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating report', 'error');
    }
  };

  if (authLoading || loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading admin operations panel...</div>;
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Executive Administration Suite
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            PlayNear Analytics & Moderation
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              Real-Time WebSocket Sync Active • {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold overflow-x-auto">
          {[
            { id: 'kpis', label: 'KPI Metrics' },
            { id: 'users', label: 'Users' },
            { id: 'communities', label: 'Communities' },
            { id: 'games', label: 'Games' },
            { id: 'reports', label: 'Reports' },
            { id: 'logs', label: 'Audit Log' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === t.id ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: KPI CARDS & CHARTS */}
      {activeTab === 'kpis' && kpis && (
        <div className="space-y-8 animate-fade-in">
          {/* 5 Core KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Registered Users
              </span>
              <p className="text-2xl font-extrabold text-slate-900">{kpis.registeredUsers}</p>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Across Bangalore
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-blue-500 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Monthly Active (MAU)
              </span>
              <p className="text-2xl font-extrabold text-slate-900">{kpis.monthlyActiveUsers}</p>
              <p className="text-[10px] text-blue-600 font-semibold">Active in last 30d</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Play Requests
              </span>
              <p className="text-2xl font-extrabold text-slate-900">{kpis.activePlayRequests}</p>
              <p className="text-[10px] text-amber-600 font-semibold">Pending & Confirmed</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-teal-500 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Match Success Rate
              </span>
              <p className="text-2xl font-extrabold text-emerald-700">{kpis.successfulMatchRate}%</p>
              <p className="text-[10px] text-emerald-600 font-semibold">Accepted / Sent</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-purple-500 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Repeat Engagement
              </span>
              <p className="text-2xl font-extrabold text-purple-700">{kpis.repeatEngagementRate}%</p>
              <p className="text-[10px] text-purple-600 font-semibold">2+ sessions completed</p>
            </div>
          </div>

          {/* Charts Row */}
          {charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game popularity */}
              <div className="glass-card p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  Most Requested Games Distribution
                </h3>
                <div className="space-y-2.5">
                  {charts.gameDistribution.map((item: any) => (
                    <div key={item._id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{item.name}</span>
                        <span>{item.count} sessions</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="gradient-sports h-full rounded-full"
                          style={{ width: `${Math.min(100, item.count * 25)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Locality breakdown */}
              <div className="glass-card p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Player Concentration by Locality
                </h3>
                <div className="space-y-2.5">
                  {charts.localityDistribution.map((item: any) => (
                    <div key={item._id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{item._id}</span>
                        <span>{item.count} registered</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, (item.count / 30) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT TABLE */}
      {activeTab === 'users' && (
        <div className="glass-card p-6 rounded-3xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">Manage Platform Accounts</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setUserSearch(e.target.value);
                  loadUsers();
                }}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Locality</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="p-3">{u.locality}</td>
                    <td className="p-3 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'organizer'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(u._id, u.status)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                          u.status === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COMMUNITIES VERIFICATION */}
      {activeTab === 'communities' && (
        <div className="glass-card p-6 rounded-3xl space-y-4 animate-fade-in">
          <h3 className="text-base font-bold text-slate-900">Society Groups Verification</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
                <tr>
                  <th className="p-3">Society Group</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Locality</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {communitiesList.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">CODE: {c.inviteCode}</div>
                    </td>
                    <td className="p-3 capitalize">{c.type}</td>
                    <td className="p-3">{c.locality}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.verificationStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.verificationStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {c.verificationStatus !== 'verified' && (
                        <button
                          onClick={() => handleVerifyCommunity(c._id, 'verified')}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold"
                        >
                          Verify
                        </button>
                      )}
                      {c.verificationStatus !== 'rejected' && (
                        <button
                          onClick={() => handleVerifyCommunity(c._id, 'rejected')}
                          className="px-2.5 py-1 rounded border border-red-200 text-red-600 font-semibold"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GAMES CRUD */}
      {activeTab === 'games' && (
        <div className="space-y-6 animate-fade-in">
          {/* Add Game Form */}
          <form onSubmit={handleCreateGame} className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Game Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Game Name (e.g. Pickleball)"
                value={newGameName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewGameName(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
              />
              <select
                value={newGameCategory}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewGameCategory(e.target.value as 'indoor' | 'outdoor')}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 capitalize"
              >
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 gradient-sports text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Create Game Category
              </button>
            </div>
          </form>

          {/* Games list */}
          <div className="glass-card p-6 rounded-3xl space-y-3">
            <h3 className="text-base font-bold text-slate-900">Platform Supported Games ({gamesList.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gamesList.map((g) => (
                <div key={g._id} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>
                  <span className="text-[10px] font-semibold text-slate-400 capitalize block mt-0.5">
                    {g.category} • {g.minPlayers}-{g.maxPlayers} players
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS MODERATION */}
      {activeTab === 'reports' && (
        <div className="glass-card p-6 rounded-3xl space-y-4 animate-fade-in">
          <h3 className="text-base font-bold text-slate-900">Community Safety & Reports ({reportsList.length})</h3>
          {reportsList.length > 0 ? (
            <div className="space-y-3">
              {reportsList.map((rep) => (
                <div key={rep._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        Reported: {rep.reportedUser?.name} ({rep.reportedUser?.email})
                      </span>
                      <p className="text-xs text-slate-500">
                        Reporter: {rep.reporter?.name} • Reason: <strong>{rep.reason}</strong>
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rep.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  {rep.details && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      "{rep.details}"
                    </p>
                  )}

                  {rep.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleResolveReport(rep._id, false)}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep._id, true)}
                        className="px-3 py-1 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Suspend Reported User
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No reports filed. Platform is safe and healthy.</p>
          )}
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="glass-card p-6 rounded-3xl space-y-4 animate-fade-in">
          <h3 className="text-base font-bold text-slate-900">Platform Activity Audit Log</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logsList.map((log) => (
              <div key={log._id} className="p-3 rounded-xl border border-slate-100 bg-white text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-emerald-700">{log.action}</span>
                  <span className="text-slate-500 ml-2">
                    on {log.entity} {log.actorEmail ? `by ${log.actorEmail}` : ''}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
