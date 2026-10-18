import React from 'react';
import Link from 'next/link';
import { Trophy, Shield, Heart, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800 pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded-lg gradient-sports flex items-center justify-center text-white">
                <Trophy className="w-4 h-4" />
              </div>
              PlayNear
            </div>
            <p className="text-slate-400 max-w-sm text-xs sm:text-sm leading-relaxed">
              Find local partners for badminton, chess, carrom, table tennis, cricket, and indoor games in your society clubhouse or local ground. No chaotic WhatsApp groups — just location-based play discovery.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Verified Safety Filters
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Neighborhood Privacy
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/find" className="hover:text-emerald-400 transition-colors">
                  Find Nearby Players
                </Link>
              </li>
              <li>
                <Link href="/communities" className="hover:text-emerald-400 transition-colors">
                  Society & Club Groups
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-emerald-400 transition-colors">
                  Update Game Preferences
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-emerald-400 transition-colors">
                  Play History & Stats
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Safety */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Community & Safety</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/settings" className="hover:text-emerald-400 transition-colors">
                  Women-Only Play Preference
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-emerald-400 transition-colors">
                  Public Places Guard
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Casually Moderated & Verified</span>
              </li>
              <li>
                <span className="text-slate-500">Zero Commercial Ads</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} PlayNear. Built for vibrant active neighborhoods.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for healthy community play
          </p>
        </div>
      </div>
    </footer>
  );
};
