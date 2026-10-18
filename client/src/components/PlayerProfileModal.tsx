'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Shield,
  UserX,
  Flag,
  Send,
  Trophy,
  Check,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: any;
  onSendRequest: (player: any) => void;
  onPlayerBlocked?: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  player,
  onSendRequest,
  onPlayerBlocked,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  if (!isOpen || !player) return null;

  const handleBlock = async () => {
    if (!confirm(`Are you sure you want to block ${player.name}? They will no longer appear in your searches.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/users/${player.id || player._id}/block`, { method: 'POST' });
      if (res.success) {
        showToast(res.message, 'success');
        onPlayerBlocked?.();
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to block user', 'error');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: player.id || player._id,
          reason: reportReason,
          details: reportDetails,
        }),
      });

      if (res.success) {
        showToast('Report submitted for admin review. Thank you for keeping our platform safe!', 'success');
        setReporting(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header Banner */}
        <div className="gradient-hero p-6 pb-4 border-b border-slate-100 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-sports flex items-center justify-center text-white text-2xl font-bold shadow-glow overflow-hidden shrink-0">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                player.name.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{player.name}</h3>
                {player.matchingScore !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {player.matchingScore}% Match
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {player.locality}
                </span>
                <span>•</span>
                <span>{player.approximateDistance || '~2 km away'}</span>
                {player.ageGroup && (
                  <>
                    <span>•</span>
                    <span>Age {player.ageGroup}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Bio */}
          {player.bio && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">About</h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{player.bio}"
              </p>
            </div>
          )}

          {/* Safety Badges */}
          <div className="flex flex-wrap gap-2">
            {player.womenOnlyPlay && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Women-Only Play Preference
              </span>
            )}
            {player.publicPlacesOnly && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Public & Community Places Only
              </span>
            )}
          </div>

          {/* Preferred Games & Skill Levels */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-emerald-600" />
              Games & Skill Rating
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {player.games && player.games.length > 0 ? (
                player.games.map((g: any, idx: number) => {
                  const gameName = g.gameName || g.game?.name || 'Game';
                  const skill = g.skillLevel || 'Intermediate';

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800 text-xs">{gameName}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          skill.toLowerCase() === 'advanced'
                            ? 'bg-purple-100 text-purple-700'
                            : skill.toLowerCase() === 'intermediate'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {skill}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 col-span-2">Casual recreational player</p>
              )}
            </div>
          </div>

          {/* Weekly Availability */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Availability
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {player.availability && player.availability.length > 0 ? (
                player.availability.map((a: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 capitalize flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-slate-400" />
                    {a.dayOfWeek} ({a.slots?.map((s: any) => s.slotType).join(', ') || 'Flexible'})
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Available on weekends & evenings</span>
              )}
            </div>
          </div>

          {/* Report Form Drawer */}
          {reporting && (
            <form onSubmit={handleReport} className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-fade-in">
              <h5 className="text-xs font-bold text-red-900">Report Inappropriate User / Profile</h5>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-2 rounded border border-red-300 bg-white"
              >
                <option value="Inappropriate behavior">Inappropriate behavior</option>
                <option value="Harassment or spam">Harassment or spam</option>
                <option value="Fake or misleading profile">Fake or misleading profile</option>
                <option value="No-show / unreliable">Chronic no-show</option>
                <option value="Other">Other reason</option>
              </select>
              <textarea
                placeholder="Additional details for platform moderators..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full text-xs p-2 rounded border border-red-300 bg-white resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="px-2.5 py-1 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
          {user && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setReporting(!reporting)}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Report user"
                aria-label="Report player"
              >
                <Flag className="w-4 h-4" />
              </button>
              <button
                onClick={handleBlock}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Block user"
                aria-label="Block player"
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onSendRequest(player);
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl gradient-sports text-white text-xs font-semibold shadow-sm hover:shadow-glow transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Invite to Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
