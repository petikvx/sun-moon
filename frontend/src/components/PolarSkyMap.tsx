import type { BodyPosition } from '../types';

const point = (position: BodyPosition) => {
  const radius = ((90 - Math.max(0, position.altitude)) / 90) * 105;
  const angle = (position.azimuth - 90) * Math.PI / 180;
  return { x: 130 + Math.cos(angle) * radius, y: 130 + Math.sin(angle) * radius };
};

export function PolarSkyMap({ sun, moon, showMoon }: { sun: BodyPosition; moon: BodyPosition; showMoon: boolean }) {
  const sunPoint = point(sun);
  const moonPoint = point(moon);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center">
      <h3 className="mb-2 text-sm font-bold text-slate-300">Carte du ciel</h3>
      <svg viewBox="0 0 260 260" className="mx-auto max-w-[300px]" role="img" aria-label="Carte polaire du ciel">
        <circle cx="130" cy="130" r="110" fill="#0f172a" stroke="#475569" />
        <circle cx="130" cy="130" r="73" fill="none" stroke="#334155" strokeDasharray="3 4" />
        <circle cx="130" cy="130" r="37" fill="none" stroke="#334155" strokeDasharray="3 4" />
        <line x1="20" y1="130" x2="240" y2="130" stroke="#334155" /><line x1="130" y1="20" x2="130" y2="240" stroke="#334155" />
        <text x="130" y="15" textAnchor="middle" fill="#94a3b8" fontSize="12">N</text><text x="250" y="134" fill="#94a3b8" fontSize="12">E</text><text x="130" y="255" textAnchor="middle" fill="#94a3b8" fontSize="12">S</text><text x="3" y="134" fill="#94a3b8" fontSize="12">O</text>
        {sun.above_horizon && <g><circle cx={sunPoint.x} cy={sunPoint.y} r="9" fill="#fbbf24" /><text x={sunPoint.x} y={sunPoint.y - 14} textAnchor="middle" fill="#fde68a" fontSize="10">Soleil</text></g>}
        {showMoon && moon.above_horizon && <g><circle cx={moonPoint.x} cy={moonPoint.y} r="8" fill="#c7d2fe" /><text x={moonPoint.x} y={moonPoint.y - 13} textAnchor="middle" fill="#e0e7ff" fontSize="10">Lune</text></g>}
      </svg>
      <p className="mt-2 text-xs text-slate-500">Centre : zénith · Bord : horizon</p>
    </div>
  );
}
