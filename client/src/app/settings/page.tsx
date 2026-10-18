'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import {
  Settings,
  Shield,
  Phone,
  UserX,
  MapPin,
  Save,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [contactPreference, setContactPreference] = useState('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [locality, setLocality] = useState('');
  const [womenOnlyPlay, setWomenOnlyPlay] = useState(false);
  const [publicPlacesOnly, setPublicPlacesOnly] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setContactPreference(user.contactPreference || 'whatsapp');
      setContactValue(user.contactValue || '');
      setLocality(user.locality || 'Indiranagar');
      setWomenOnlyPlay(!!user.womenOnlyPlay);
      setPublicPlacesOnly(!!user.publicPlacesOnly);
      setBlockedUsers(user.blockedUsers || []);
    }
  }, [user, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          contactPreference,
          contactValue,
          locality,
          womenOnlyPlay,
          publicPlacesOnly,
        }),
      });

      if (res.success) {
        showToast('Settings & safety preferences updated!', 'success');
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (targetId: string) => {
    try {
      const res = await apiFetch(`/users/${targetId}/block`, { method: 'POST' });
      if (res.success) {
        showToast('User unblocked', 'info');
        setBlockedUsers(blockedUsers.filter((id) => id !== targetId));
        refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unblock user', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-600" />
          Settings & Safety Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your contact coordinates, location privacy, and comfort filters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Safety Section */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Shield className="w-5 h-5 text-emerald-600" />
            Safety & Comfort Controls
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={womenOnlyPlay}
                onChange={(e) => setWomenOnlyPlay(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  Women-Only Play Preference
                </span>
                <span className="block text-xs text-slate-500 leading-relaxed mt-0.5">
                  When enabled, male players cannot send you play invites or view your profile in searches.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={publicPlacesOnly}
                onChange={(e) => setPublicPlacesOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  Meet only at Public & Community Places
                </span>
                <span className="block text-xs text-slate-500 leading-relaxed mt-0.5">
                  Flags your profile to indicate you only play at society clubhouses or public grounds.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Contact Coordinates */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Phone className="w-5 h-5 text-emerald-600" />
            Contact Coordinate (Protected)
          </div>
          <p className="text-xs text-slate-500">
            This contact handle is strictly hidden from the public and revealed to another player <strong>only after</strong> you accept their play request.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Preference
              </label>
              <select
                value={contactPreference}
                onChange={(e) => setContactPreference(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold uppercase"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone Call</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Contact Handle / Number
              </label>
              <input
                type="text"
                required
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Locality */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Home Locality
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Primary Neighborhood
            </label>
            <input
              type="text"
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
        </div>

        {/* Blocked Users Section */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UserX className="w-5 h-5 text-red-500" />
            Blocked Players ({blockedUsers.length})
          </div>

          {blockedUsers.length > 0 ? (
            <div className="space-y-2">
              {blockedUsers.map((id) => (
                <div
                  key={id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-slate-600">User ID: {id}</span>
                  <button
                    type="button"
                    onClick={() => handleUnblock(id)}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">You have not blocked any players.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
