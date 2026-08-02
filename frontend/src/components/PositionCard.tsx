import { Eye, EyeOff, Navigation, Sun } from 'lucide-react';
import { formatDistance } from '../utils/astronomy';
import type { BodyPosition } from '../types';

export function PositionCard({ name, icon: Icon, position, color }: { name: string; icon: typeof Sun; position: BodyPosition; color: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className={`flex items-center gap-2 text-lg font-bold ${color}`}><Icon size={21} /> {name}</h3>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${position.above_horizon ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{position.above_horizon ? <Eye size={13} /> : <EyeOff size={13} />}{position.above_horizon ? 'Visible' : 'Sous l’horizon'}</span>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Altitude</dt><dd className="mt-1 text-2xl font-bold text-white">{position.altitude.toFixed(1)}°</dd></div>
        <div><dt className="text-slate-500">Azimut</dt><dd className="mt-1 text-2xl font-bold text-white">{position.azimuth.toFixed(1)}°</dd></div>
        <div><dt className="text-slate-500">Direction</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-slate-200"><Navigation size={17} style={{ transform: `rotate(${position.azimuth - 45}deg)` }} /> {position.direction}</dd></div>
        <div><dt className="text-slate-500">Distance</dt><dd className="mt-1 font-semibold text-slate-200">{formatDistance(position.distance_km)} km</dd></div>
      </dl>
    </article>
  );
}
