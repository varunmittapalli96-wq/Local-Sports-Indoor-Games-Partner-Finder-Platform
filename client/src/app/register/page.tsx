'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trophy, Mail, Lock, User, MapPin, Phone, Shield, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locality, setLocality] = useState('Indiranagar');
  const [gender, setGender] = useState<'male' | 'female' | 'prefer-not-to-say'>('prefer-not-to-say');
  const [ageGroup, setAgeGroup] = useState('25-34');
  const [contactPreference, setContactPreference] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [womenOnlyPlay, setWomenOnlyPlay] = useState(false);
  const [publicPlacesOnly, setPublicPlacesOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) {
      showToast('Please provide your contact handle (WhatsApp/Phone/Email)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Coordinate presets by locality
      let lat = 12.9784;
      let lng = 77.6408;
      if (locality === 'Koramangala') {
        lat = 12.9352;
        lng = 77.6245;
      } else if (locality === 'HSR Layout') {
        lat = 12.9121;
        lng = 77.6446;
      }

      await register({
        name,
        email,
        password,
        locality,
        lat,
        lng,
        gender,
        ageGroup,
        contactPreference,
        contactValue,
        womenOnlyPlay,
        publicPlacesOnly,
      });

      showToast('Account created! Let us set up your preferred games.', 'success');
      router.push('/onboarding');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl gradient-sports flex items-center justify-center text-white mx-auto shadow-glow">
          <Trophy className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Join PlayNear
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Find sports & indoor game partners around your neighborhood.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Password (min 6 characters)
          </label>
          <div className="relative">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Locality & Age Group */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Locality / Area
            </label>
            <div className="relative">
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              >
                <option value="Indiranagar">Indiranagar</option>
                <option value="Koramangala">Koramangala</option>
                <option value="HSR Layout">HSR Layout</option>
                <option value="Whitefield">Whitefield</option>
                <option value="Jayanagar">Jayanagar</option>
              </select>
              <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Age Group
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="18-24">18 - 24</option>
              <option value="25-34">25 - 34</option>
              <option value="35-44">35 - 44</option>
              <option value="45-54">45 - 54</option>
              <option value="55+">55+</option>
            </select>
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Gender (Optional)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'male', label: 'Male' },
              { id: 'female', label: 'Female' },
              { id: 'prefer-not-to-say', label: 'Prefer not to say' },
            ].map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => setGender(g.id as any)}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  gender === g.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Preference & Value */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Contact Coordinate (Revealed only after request acceptance)
          </label>
          <div className="flex gap-2">
            <select
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value as any)}
              className="w-32 px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={contactPreference === 'whatsapp' ? '+91 98765 43210' : 'Your contact handle'}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Safety Preferences */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Shield className="w-4 h-4 text-emerald-600" />
            Safety & Comfort Preferences
          </div>

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
            <span>Meet only at public / community places (society clubhouse or public ground)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-sports text-white text-sm font-bold shadow-sm hover:shadow-glow hover:opacity-95 disabled:opacity-50 transition-all"
        >
          {submitting ? 'Creating profile...' : 'Continue to Game Selection'}
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-slate-500 pt-1">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
