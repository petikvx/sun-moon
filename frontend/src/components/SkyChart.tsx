import { formatTime } from '../utils/astronomy';
import type { PositionPoint } from '../types';

export function SkyChart({ positions, selectedIndex, timezone, showMoon }: { positions: PositionPoint[]; selectedIndex: number; timezone: string; showMoon: boolean }) {
  const width = 680;
  const left = 52;
  const x = (index: number) => left + (index / Math.max(positions.length - 1, 1)) * width;
  const y = (altitude: number) => 20 + (90 - altitude);
  const path = (body: 'sun' | 'moon') => positions.map((point, index) => `${x(index)},${y(point[body].altitude)}`).join(' ');
  const ticks = positions.map((_, index) => index).filter((index) => index % 36 === 0 || index === positions.length - 1);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3">
      <svg id="sky-chart" viewBox="0 0 780 235" className="min-w-[620px]" role="img" aria-label="Trajectoire du Soleil et de la Lune selon leur altitude">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset="0.5" stopColor="#0f172a" /><stop offset="1" stopColor="#020617" /></linearGradient></defs>
        <rect width="780" height="235" fill="#020617" />
        <rect x="52" y="20" width="680" height="180" rx="12" fill="url(#sky)" />
        <line x1="52" y1="110" x2="732" y2="110" stroke="#64748b" strokeDasharray="5 5" />
        <text x="8" y="25" fill="#94a3b8" fontSize="11">+90°</text><text x="8" y="114" fill="#94a3b8" fontSize="11">0°</text><text x="8" y="202" fill="#94a3b8" fontSize="11">−90°</text><text x="58" y="104" fill="#94a3b8" fontSize="10">horizon</text>
        {ticks.map((index) => <g key={index}><line x1={x(index)} y1="200" x2={x(index)} y2="205" stroke="#64748b" /><text x={x(index)} y="220" textAnchor="middle" fill="#94a3b8" fontSize="11">{formatTime(positions[index].time, timezone)}</text></g>)}
        <polyline points={path('sun')} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        {showMoon && <polyline points={path('moon')} fill="none" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" />}
        <line x1={x(selectedIndex)} y1="20" x2={x(selectedIndex)} y2="200" stroke="#fff" strokeOpacity="0.35" />
        <circle cx={x(selectedIndex)} cy={y(positions[selectedIndex].sun.altitude)} r="6" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
        {showMoon && <circle cx={x(selectedIndex)} cy={y(positions[selectedIndex].moon.altitude)} r="6" fill="#c7d2fe" stroke="#fff" strokeWidth="2" />}
      </svg>
    </div>
  );
}
