import { Cloud, Droplets, Eye, Moon, Navigation, Umbrella } from 'lucide-react';
import type { ObservationForecastDay } from '../types';
import { formatDuration, formatTime } from '../utils/astronomy';
import { scoreLabel } from '../utils/forecast';

interface Props { days: ObservationForecastDay[]; timezone: string; onSelectDate: (date: string) => void }

const value = (number: number | null, suffix: string) => number === null ? '—' : `${number}${suffix}`;

export function ForecastPanel({ days, timezone, onSelectDate }: Props) {
  return <section aria-labelledby="forecast-title"><div className="mb-4"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Planifier une observation</p><h2 id="forecast-title" className="text-2xl font-black">Les 7 prochaines nuits</h2><p className="mt-1 text-sm text-slate-400">Le score combine ciel, visibilité, humidité, pluie, obscurité et lumière lunaire.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{days.map((day, index) => <article key={day.date} className={`rounded-2xl border p-5 ${index === 0 ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/10 bg-slate-900'}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' })}</p><h3 className="mt-1 text-lg font-black">{new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</h3></div><div className={`grid size-14 place-items-center rounded-full text-lg font-black ${day.score !== null && day.score >= 65 ? 'bg-emerald-500/20 text-emerald-300' : day.score !== null && day.score >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>{day.score ?? '—'}</div></div>
      <p className="mt-3 text-sm font-semibold text-cyan-200">{scoreLabel(day.score)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Cloud size={13}/> Nuages</dt><dd className="mt-1 font-bold">{value(day.cloudCover, '%')}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Eye size={13}/> Visibilité</dt><dd className="mt-1 font-bold">{day.visibility === null ? '—' : `${Math.round(day.visibility / 1000)} km`}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Droplets size={13}/> Humidité</dt><dd className="mt-1 font-bold">{value(day.humidity, '%')}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Umbrella size={13}/> Pluie</dt><dd className="mt-1 font-bold">{value(day.precipitationProbability, '%')}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Navigation size={13}/> Vent</dt><dd className="mt-1 font-bold">{value(day.windSpeed, ' km/h')}</dd></div><div className="rounded-lg bg-white/5 p-2"><dt className="flex items-center gap-1 text-slate-500"><Moon size={13}/> Lune</dt><dd className="mt-1 font-bold">{day.moon_details.illumination_percent}%</dd></div></dl>
      <p className="mt-3 text-xs text-slate-500">Nuit noire : {day.darkSeconds === null ? 'polaire/indéterminée' : formatDuration(day.darkSeconds)} · dès {formatTime(day.light.astronomical_dusk, timezone)}</p>
      <button type="button" onClick={() => onSelectDate(day.date)} className="mt-4 w-full rounded-lg bg-white/5 px-3 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20">Voir cette journée</button>
    </article>)}</div>
  </section>;
}
