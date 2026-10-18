'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Map as MapIcon,
  List,
  Filter,
  Sliders,
  MapPin,
  Trophy,
  Calendar,
  Clock,
  Shield,
  Send,
  Sparkles,
  Search,
  RotateCcw,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { SendRequestModal } from '../../components/SendRequestModal';
import { PlayerProfileModal } from '../../components/PlayerProfileModal';

// Dynamically import LeafletMap with no SSR to support window/DOM
const DynamicLeafletMap = dynamic(
  () => import('../../components/LeafletMap').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
        Loading interactive map...
      </div>
    ),
  }
);

export default function FindPlayersPage() {
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Filters state
  const [selectedGame, setSelectedGame] = useState('');
  const [radiusKm, setRadiusKm] = useState(20);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Center coordinate
  const [centerCoords, setCenterCoords] = useState<[number, number]>([12.9784, 77.6408]); // Indiranagar default

  // Modals state
  const [selectedPlayerForRequest, setSelectedPlayerForRequest] = useState<any | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);

  // Load games list on mount
  useEffect(() => {
    apiFetch<{ success: boolean; games: any[] }>('/games')
      .then((res) => {
        if (res.success) setGames(res.games);
      })
      .catch(() => {});
  }, []);

  // Fetch players with current filters
  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedGame) params.append('game', selectedGame);
      params.append('radius', radiusKm.toString());
      if (selectedDay) params.append('day', selectedDay);
      if (selectedTimeSlot) params.append('time', selectedTimeSlot);
      if (selectedSkill) params.append('skill', selectedSkill);
      if (womenOnly) params.append('womenOnly', 'true');
      params.append('limit', '30');

      const res = await apiFetch<{
        success: boolean;
        players: any[];
        executionTimeMs: number;
      }>(`/players/search?${params.toString()}`);

      if (res.success) {
        setPlayers(res.players);
        setExecutionTime(res.executionTimeMs);
      }
    } catch (err: any) {
      showToast(err.message || 'Error searching players', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedGame, radiusKm, selectedDay, selectedTimeSlot, selectedSkill, womenOnly, showToast]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleResetFilters = () => {
    setSelectedGame('');
    setRadiusKm(20);
    setSelectedDay('');
    setSelectedTimeSlot('');
    setSelectedSkill('');
    setWomenOnly(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Page Title & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-600" />
            Find Game Partners Nearby
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse recreational players scored by location, availability, and skill level.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter button for mobile */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="sm:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs"
          >
            <Filter className="w-4 h-4 text-emerald-600" />
            Filters
          </button>

          {/* List / Map View Switcher */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map View
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Collapsible on mobile, persistent on desktop) */}
      <div
        className={`glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4 ${
          filtersOpen ? 'block' : 'hidden sm:block'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          {/* Game filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Game
            </label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="">All Games (Indoor & Outdoor)</option>
              {games.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Availability Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50 capitalize"
            >
              <option value="">Any Day</option>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                (d) => (
                  <option key={d} value={d} className="capitalize">
                    {d}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Time Slot
            </label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="">Any Time</option>
              <option value="morning">Morning (6 AM - 10 AM)</option>
              <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
              <option value="evening">Evening (5 PM - 9 PM)</option>
            </select>
          </div>

          {/* Skill Level */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Skill Closeness
            </label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="">All Skill Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Search Radius Slider */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              <span>Radius</span>
              <span className="text-emerald-700">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Second Row: Safety toggle & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 text-xs">
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={womenOnly}
              onChange={(e) => setWomenOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-pink-600" />
              Women-only matches only
            </span>
          </label>

          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong>{players.length}</strong> matching players nearby
        </span>
        {executionTime !== null && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Found in {executionTime}ms (&lt; 3.0s guarantee)
          </span>
        )}
      </div>

      {/* Content View: Map vs List */}
      {viewMode === 'map' ? (
        <div className="h-[550px] w-full rounded-2xl overflow-hidden shadow-sm">
          <DynamicLeafletMap
            players={players}
            center={centerCoords}
            onSelectPlayer={(p) => setViewingPlayer(p)}
            onSendRequest={(p) => setSelectedPlayerForRequest(p)}
          />
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-4 bg-slate-200 rounded" />
                    <div className="w-32 h-3 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="w-full h-8 bg-slate-200 rounded" />
              </div>
            ))
          ) : players.length > 0 ? (
            players.map((player) => (
              <div
                key={player.id}
                className="glass-card p-5 rounded-2xl flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl gradient-sports text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {player.photo ? (
                            <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            player.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {player.isOnline && (
                          <span
                            title="Online Now"
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                            {player.name}
                          </h3>
                          {player.isOnline && (
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-full">
                              ● Online
                            </span>
                          )}
                        </div>
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

                  {/* Games Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {player.games?.map((g: any, idx: number) => (
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
                    View Details
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
            ))
          ) : (
            <div className="col-span-full glass-card p-12 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No players found matching your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your search radius or clearing specific day/time restrictions.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl gradient-sports text-white text-xs font-semibold shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SendRequestModal
        isOpen={!!selectedPlayerForRequest}
        onClose={() => setSelectedPlayerForRequest(null)}
        targetPlayer={selectedPlayerForRequest}
        onSuccess={() => fetchPlayers()}
      />

      <PlayerProfileModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        player={viewingPlayer}
        onSendRequest={(p) => setSelectedPlayerForRequest(p)}
        onPlayerBlocked={() => fetchPlayers()}
      />
    </div>
  );
}
