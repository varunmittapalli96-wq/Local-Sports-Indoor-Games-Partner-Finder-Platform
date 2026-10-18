import Link from 'next/link';
import { Compass, Trophy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="py-24 text-center space-y-4 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl gradient-sports flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-glow">
        <Trophy className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Out of Bounds</h1>
      <p className="text-sm text-slate-500">
        The play session or page you are looking for does not exist or has moved.
      </p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-sports text-white text-xs font-bold shadow-sm"
        >
          <Compass className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  );
}
