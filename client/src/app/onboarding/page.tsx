'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Shield,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [allGames, setAllGames] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Step 1: Bio & Safety
  const [bio, setBio] = useState('');
  const [locality, setLocality] = useState('Indiranagar');
  const [womenOnlyPlay, setWomenOnlyPlay] = useState(false);
  const [publicPlacesOnly, setPublicPlacesOnly] = useState(false);

  // Step 2: Games with skill levels
  const [selectedGames, setSelectedGames] = useState<
    Array<{ gameId: string; name: string; category: string; skillLevel: 'beginner' | 'intermediate' | 'advanced' }>
  >([]);

  // Step 3: Weekly availability
  const [availabilities, setAvailabilities] = useState<
    Array<{ dayOfWeek: string; slots: Array<{ slotType: 'morning' | 'afternoon' | 'evening' | 'custom'; start: string; end: string }> }>
  >([
    {
      dayOfWeek: 'saturday',
      slots: [
        { slotType: 'morning', start: '06:30', end: '08:30' },
        { slotType: 'evening', start: '18:00', end: '20:30' },
      ],
    },
    {
      dayOfWeek: 'sunday',
      slots: [
        { slotType: 'morning', start: '07:00', end: '09:30' },
        { slotType: 'evening', start: '17:30', end: '20:00' },
      ],
    },
  ]);

  // Step 4: Playing locations & primary venue
  const [playingLocations, setPlayingLocations] = useState<string[]>(['clubhouse', 'ground']);
  const [primaryVenue, setPrimaryVenue] = useState('Indiranagar Club & Turf');

  useEffect(() => {
    // Fetch available games
    apiFetch<{ success: boolean; games: any[] }>('/games')
      .then((res) => {
        if (res.success) {
          setAllGames(res.games);
          // If no games selected yet, pre-select Badminton & Chess as popular defaults
          if (selectedGames.length === 0 && res.games.length > 0) {
            const defaults = res.games.slice(0, 2).map((g) => ({
              gameId: g._id,
              name: g.name,
              category: g.category,
              skillLevel: 'intermediate' as const,
            }));
            setSelectedGames(defaults);
          }
        }
      })
      .catch(() => {});

    if (user) {
      if (user.bio) setBio(user.bio);
      if (user.locality) setLocality(user.locality);
      if (user.womenOnlyPlay) setWomenOnlyPlay(user.womenOnlyPlay);
      if (user.publicPlacesOnly) setPublicPlacesOnly(user.publicPlacesOnly);
      if (user.playingLocations) setPlayingLocations(user.playingLocations);
      if (user.primaryVenue) setPrimaryVenue(user.primaryVenue);
    }
  }, [user]);

  const toggleGame = (game: any) => {
    const existing = selectedGames.find((g) => g.gameId === game._id);
    if (existing) {
      if (selectedGames.length === 1) {
        showToast('Please keep at least one game selected', 'info');
        return;
      }
      setSelectedGames(selectedGames.filter((g) => g.gameId !== game._id));
    } else {
      setSelectedGames([
        ...selectedGames,
        { gameId: game._id, name: game.name, category: game.category, skillLevel: 'intermediate' },
      ]);
    }
  };

  const updateSkill = (gameId: string, skill: 'beginner' | 'intermediate' | 'advanced') => {
    setSelectedGames(
      selectedGames.map((g) => (g.gameId === gameId ? { ...g, skillLevel: skill } : g))
    );
  };

  const toggleDay = (day: string) => {
    const existing = availabilities.find((a) => a.dayOfWeek === day);
    if (existing) {
      setAvailabilities(availabilities.filter((a) => a.dayOfWeek !== day));
    } else {
      setAvailabilities([
        ...availabilities,
        {
          dayOfWeek: day,
          slots: [{ slotType: 'evening', start: '18:00', end: '20:00' }],
        },
      ]);
    }
  };

  const toggleLocationType = (type: string) => {
    if (playingLocations.includes(type)) {
      if (playingLocations.length === 1) return;
      setPlayingLocations(playingLocations.filter((t) => t !== type));
    } else {
      setPlayingLocations([...playingLocations, type]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Update Profile & Locations
      await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          bio,
          locality,
          womenOnlyPlay,
          publicPlacesOnly,
          playingLocations,
          primaryVenue,
        }),
      });

      // 2. Update Games
      await apiFetch('/users/me/games', {
        method: 'PUT',
        body: JSON.stringify({
          games: selectedGames.map((g) => ({
            gameId: g.gameId,
            skillLevel: g.skillLevel,
          })),
        }),
      });

      // 3. Update Availability
      await apiFetch('/users/me/availability', {
        method: 'PUT',
        body: JSON.stringify({
          availabilities,
        }),
      });

      await refreshUser();
      showToast('Onboarding complete! Your profile is ready for partner discovery.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Error saving onboarding details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Progress Bar & Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>Step {step} of 4</span>
          <span>
            {step === 1 && 'Profile & Neighborhood'}
            {step === 2 && 'Preferred Games & Skills'}
            {step === 3 && 'Weekly Availability'}
            {step === 4 && 'Playing Venues'}
          </span>
        </div>

        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="gradient-sports h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Profile & Safety */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Your Sports Persona</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Tell nearby partners what kind of friendly games you enjoy.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Player Bio / Recreation Goals
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Intermediate badminton player looking for friendly rallies on Tuesday evenings and weekend mornings. Also enjoy casual rapid chess!"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Locality
            </label>
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="Indiranagar">Indiranagar (Bangalore)</option>
              <option value="Koramangala">Koramangala (Bangalore)</option>
              <option value="HSR Layout">HSR Layout (Bangalore)</option>
              <option value="Whitefield">Whitefield (Bangalore)</option>
              <option value="Jayanagar">Jayanagar (Bangalore)</option>
            </select>
          </div>

          {/* Safety Toggles */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              Safety Preferences
            </h4>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={womenOnlyPlay}
                onChange={(e) => setWomenOnlyPlay(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Women-only play preference (match only with verified women players)</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publicPlacesOnly}
                onChange={(e) => setPublicPlacesOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>Meet only at public & community places (clubhouse or local ground)</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:opacity-95"
            >
              Next: Select Games
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preferred Games & Skill Levels */}
      {step === 2 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Which games do you play?</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Select your sports/games and set your casual skill rating.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {allGames.map((g) => {
              const isSelected = selectedGames.some((sg) => sg.gameId === g._id);
              const selectedItem = selectedGames.find((sg) => sg.gameId === g._id);

              return (
                <div
                  key={g._id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleGame(g)}
                      className="flex items-center gap-2 font-bold text-slate-900 text-sm hover:text-emerald-600 text-left"
                    >
                      <span className="w-5 h-5 rounded-full border border-emerald-500 flex items-center justify-center shrink-0">
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                      </span>
                      {g.name}
                    </button>
                    <span className="text-[10px] font-semibold text-slate-400 capitalize">
                      {g.category}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-600">Your Skill:</span>
                      <div className="flex gap-1">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => updateSkill(g._id, lvl)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all ${
                              selectedItem?.skillLevel === lvl
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:opacity-95"
            >
              Next: Availability
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Weekly Availability Schedule */}
      {step === 3 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">When are you free to play?</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Select days and preferred time slots (mornings, evenings, or weekends).
            </p>
          </div>

          <div className="space-y-3">
            {daysOfWeek.map((day) => {
              const active = availabilities.some((a) => a.dayOfWeek === day);
              const currentAvail = availabilities.find((a) => a.dayOfWeek === day);

              return (
                <div
                  key={day}
                  className={`p-3 rounded-2xl border transition-all ${
                    active ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="flex items-center gap-2.5 font-bold text-slate-800 capitalize text-sm hover:text-emerald-600"
                    >
                      <span className="w-5 h-5 rounded-md border border-slate-300 flex items-center justify-center">
                        {active && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </span>
                      {day}
                    </button>

                    {active ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        {currentAvail?.slots.map((s) => s.slotType).join(' & ') || 'Evening'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:opacity-95"
            >
              Next: Playing Venues
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Playing Locations & Complete */}
      {step === 4 && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Where do you prefer to play?</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Select venue types you are comfortable playing at.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'clubhouse', title: 'Clubhouse', desc: 'Apartment / Society Club' },
              { id: 'ground', title: 'Local Ground', desc: 'Turf / Park / Court' },
              { id: 'home', title: 'Home', desc: 'Tabletop / Living room' },
            ].map((loc) => {
              const active = playingLocations.includes(loc.id);

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => toggleLocationType(loc.id)}
                  className={`p-4 rounded-2xl border text-center space-y-1 transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <MapPin className={`w-6 h-6 mx-auto ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <h4 className="font-bold text-slate-900 text-sm">{loc.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">{loc.desc}</p>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Venue / Landmark (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Prestige Palms Clubhouse Court 1 or Indiranagar Club"
              value={primaryVenue}
              onChange={(e) => setPrimaryVenue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="flex items-center gap-2 px-8 py-3 rounded-xl gradient-sports text-white text-sm font-bold shadow-glow hover:opacity-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {saving ? 'Saving...' : 'Finish Setup & View Matches'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
