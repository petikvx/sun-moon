import type { BodyPosition, PositionPoint } from '../types';

const point = (body: BodyPosition) => {
  const radius = (90 - Math.max(0, body.altitude)) / 90 * 128;
  const angle = (body.azimuth - 90) * Math.PI / 180;
  return { x: 160 + Math.cos(angle) * radius, y: 160 + Math.sin(angle) * radius };
};

const pathFor = (positions: PositionPoint[], body: 'sun' | 'moon') => positions.filter((position) => position[body].above_horizon).filter((_, index) => index % 3 === 0).map((position, index) => { const p = point(position[body]); return `${index ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ');

export function SkyDome({ positions, currentIndex, showMoon }: { positions: PositionPoint[]; currentIndex: number; showMoon: boolean }) {
  const current = positions[currentIndex];
  const sunPoint = point(current.sun); const moonPoint = point(current.moon);
  return <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4" aria-labelledby="sky-dome-title"><div className="mb-3"><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Voûte céleste</p><h3 id="sky-dome-title" className="font-black">Trajectoires au-dessus de l’horizon</h3></div><svg viewBox="0 0 320 320" className="mx-auto w-full max-w-md" role="img" aria-label={`Carte du ciel. Soleil ${current.sun.direction} à ${current.sun.altitude} degrés${showMoon ? `, Lune ${current.moon.direction} à ${current.moon.altitude} degrés` : ''}`}>
    <defs><radialGradient id="dome"><stop offset="0" stopColor="#312e81"/><stop offset=".6" stopColor="#172554"/><stop offset="1" stopColor="#020617"/></radialGradient></defs>
    <circle cx="160" cy="160" r="132" fill="url(#dome)" stroke="#64748b" strokeWidth="2"/><circle cx="160" cy="160" r="88" fill="none" stroke="#64748b" strokeDasharray="3 6" opacity=".45"/><circle cx="160" cy="160" r="44" fill="none" stroke="#64748b" strokeDasharray="3 6" opacity=".45"/>
    <path d="M28 160H292M160 28V292" stroke="#64748b" opacity=".35"/><text x="160" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="12">N</text><text x="304" y="164" textAnchor="middle" fill="#e2e8f0" fontSize="12">E</text><text x="160" y="313" textAnchor="middle" fill="#e2e8f0" fontSize="12">S</text><text x="16" y="164" textAnchor="middle" fill="#e2e8f0" fontSize="12">O</text><text x="160" y="156" textAnchor="middle" fill="#94a3b8" fontSize="10">Zénith</text>
    <path d={pathFor(positions, 'sun')} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/><path d={pathFor(positions, 'moon')} fill="none" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="5 5" opacity={showMoon ? 1 : 0}/>
    {current.sun.above_horizon && <g className="sky-marker" style={{ transform: `translate(${sunPoint.x}px, ${sunPoint.y}px)` }}><circle r="9" fill="#fbbf24"/><circle r="15" fill="none" stroke="#fbbf24" opacity=".35"/></g>}
    {showMoon && current.moon.above_horizon && <g className="sky-marker" style={{ transform: `translate(${moonPoint.x}px, ${moonPoint.y}px)` }}><circle r="8" fill="#e0e7ff"/><circle cx="3" cy="-2" r="8" fill="#312e81"/></g>}
  </svg><div className="mt-2 flex justify-center gap-5 text-xs"><span className="text-amber-300">● Soleil</span>{showMoon && <span className="text-indigo-200">– – Lune</span>}<span className="text-slate-500">Cercles : 30° / 60°</span></div></article>;
}
