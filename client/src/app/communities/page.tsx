'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import {
  Users,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  X,
  Trophy,
} from 'lucide-react';

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Create community modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'society' | 'club' | 'neighborhood' | 'corporate'>('society');
  const [locality, setLocality] = useState('Indiranagar');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('Arrive on time. Be friendly and respectful.');
  const [creating, setCreating] = useState(false);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);

      const res = await apiFetch<{ success: boolean; communities: any[] }>(
        `/communities?${params.toString()}`
      );
      if (res.success) {
        setCommunities(res.communities);
      }
    } catch (err: any) {
      showToast(err.message || 'Error fetching communities', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [search, typeFilter]);

  // Real-time automatic data sync on community events
  useEffect(() => {
    const handleCommunitySync = (e: any) => {
      if (e.detail?.entity === 'Community') {
        fetchCommunities();
      }
    };

    window.addEventListener('playnear:activity', handleCommunitySync);
    return () => {
      window.removeEventListener('playnear:activity', handleCommunitySync);
    };
  }, [search, typeFilter]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please log in to create a society community group', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/communities', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          locality,
          description,
          rules,
        }),
      });

      if (res.success) {
        showToast('Community group created successfully!', 'success');
        setCreateModalOpen(false);
        fetchCommunities();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create community', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Society & Club Sports Hubs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Join sports associations in your apartment complex or local neighborhood club.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              showToast('Please sign in to register your apartment group', 'info');
              return;
            }
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-sports text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Community Group
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search communities by society or club name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white capitalize"
        >
          <option value="">All Hub Types</option>
          <option value="society">Residential Society</option>
          <option value="club">Recreational Club</option>
          <option value="neighborhood">Neighborhood Group</option>
        </select>
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading communities...</div>
        ) : communities.length > 0 ? (
          communities.map((comm) => (
            <div
              key={comm._id}
              className="glass-card p-6 rounded-3xl flex flex-col justify-between gap-4 border border-slate-200/90 shadow-xs group"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-xs">
                    {comm.logo ? (
                      <img src={comm.logo} alt={comm.name} className="w-full h-full object-cover" />
                    ) : (
                      comm.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                      {comm.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {comm.locality}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {comm.type}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                  <span className="text-xs text-slate-500 font-medium ml-auto">
                    {comm.members?.length || 1} members
                  </span>
                </div>

                {comm.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {comm.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  CODE: {comm.inviteCode}
                </span>
                <Link
                  href={`/communities/${comm._id}`}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:gap-1.5 transition-all"
                >
                  View Hub & Sessions
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full glass-card p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No communities found</h3>
            <p className="text-xs text-slate-500">
              Be the first to create an active sports hub for your residential complex or neighborhood!
            </p>
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden">
            <div className="gradient-sports p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Register Society / Club Sports Group</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prestige Palms Sports Association"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Group Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 capitalize"
                  >
                    <option value="society">Residential Society</option>
                    <option value="club">Sports Club</option>
                    <option value="neighborhood">Neighborhood League</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Locality
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Koramangala"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Tell residents what sports courts and equipment are available..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Community Rules
                </label>
                <input
                  type="text"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 gradient-sports text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95"
                >
                  {creating ? 'Creating...' : 'Create Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
