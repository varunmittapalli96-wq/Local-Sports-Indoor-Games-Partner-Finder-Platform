'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Send, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: {
    id: string;
    name: string;
    locality: string;
    games?: Array<{ gameId: string; gameName: string; skillLevel: string }>;
    playingLocations?: string[];
    primaryVenue?: string;
  } | null;
  onSuccess?: () => void;
}

export const SendRequestModal: React.FC<SendRequestModalProps> = ({
  isOpen,
  onClose,
  targetPlayer,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [allGames, setAllGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [locationType, setLocationType] = useState<'clubhouse' | 'ground' | 'home'>('clubhouse');
  const [venue, setVenue] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load available games
    apiFetch<{ success: boolean; games: any[] }>('/games')
      .then((res) => {
        if (res.success && res.games.length > 0) {
          setAllGames(res.games);
          // If player has a preferred game, auto-select it
          if (targetPlayer?.games && targetPlayer.games.length > 0) {
            setSelectedGameId(targetPlayer.games[0].gameId);
          } else {
            setSelectedGameId(res.games[0]._id);
          }
        }
      })
      .catch(() => {});

    // Set default date to tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setTime('18:00');

    if (targetPlayer?.primaryVenue) {
      setVenue(targetPlayer.primaryVenue);
    }
  }, [isOpen, targetPlayer]);

  if (!isOpen || !targetPlayer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId) {
      showToast('Please select a game', 'error');
      return;
    }

    if (!date || !time) {
      showToast('Please specify a date and time', 'error');
      return;
    }

    const proposedDateTime = new Date(`${date}T${time}:00`);
    if (proposedDateTime <= new Date()) {
      showToast('Session date & time must be in the future', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: targetPlayer.id,
          gameId: selectedGameId,
          proposedDateTime: proposedDateTime.toISOString(),
          durationMinutes: duration,
          locationType,
          venue: venue.trim(),
          message: message.trim(),
        }),
      });

      if (res.success) {
        showToast(`Play request sent to ${targetPlayer.name}!`, 'success');
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not send play request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="gradient-sports p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Invite {targetPlayer.name} to Play</h3>
            <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {targetPlayer.locality}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Game Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Game
            </label>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium"
              required
            >
              {allGames.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name} ({g.category})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  required
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Session Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    duration === dur
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {dur} mins
                </button>
              ))}
            </div>
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Playing Location Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'clubhouse', label: 'Clubhouse' },
                { id: 'ground', label: 'Local Ground' },
                { id: 'home', label: 'Home' },
              ].map((loc) => (
                <button
                  type="button"
                  key={loc.id}
                  onClick={() => setLocationType(loc.id as any)}
                  className={`py-2 text-xs font-semibold rounded-xl border capitalize transition-all ${
                    locationType === loc.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Venue details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Venue / Landmark (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Prestige Palms Badminton Court 1 or BDA Ground"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Personal Message
            </label>
            <textarea
              placeholder="Hey! Looking forward to playing with you. Let me know if the time suits!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Direct contact details (WhatsApp / phone) are safely protected and revealed <strong>only after</strong> both players accept the request.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-sports text-white text-sm font-semibold hover:opacity-95 shadow-sm hover:shadow-glow disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Play Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
