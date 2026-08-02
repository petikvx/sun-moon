import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  Sparkles,
  Sun,
} from 'lucide-react';

interface Events {
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
}

interface BodyPosition {
  altitude: number;
  azimuth: number;
  direction: string;
  above_horizon: boolean;
  distance_km: number;
}

interface PositionPoint {
  time: string;
  sun: BodyPosition;
  moon: BodyPosition;
}

interface DayData {
  timezone: string;
  events: Events;
  positions: PositionPoint[];
}

interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
}

const CITIES: City[] = [
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
  { id: 'lyon', name: 'Lyon', country: 'France', lat: 45.764, lon: 4.8357, timezone: 'Europe/Paris' },
  { id: 'marseille', name: 'Marseille', country: 'France', lat: 43.2965, lon: 5.3698, timezone: 'Europe/Paris' },
  { id: 'london', name: 'Londres', country: 'Royaume-Uni', lat: 51.5072, lon: -0.1276, timezone: 'Europe/London' },
  { id: 'montreal', name: 'Montréal', country: 'Canada', lat: 45.5019, lon: -73.5674, timezone: 'America/Toronto' },
  { id: 'new-york', name: 'New York', country: 'États-Unis', lat: 40.7128, lon: -74.006, timezone: 'America/New_York' },
  { id: 'cairo', name: 'Le Caire', country: 'Égypte', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
  { id: 'reunion', name: 'Saint-Denis', country: 'La Réunion', lat: -20.8789, lon: 55.4481, timezone: 'Indian/Reunion' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japon', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'sydney', name: 'Sydney', country: 'Australie', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
];

const MIN_DATE = '1899-07-29';
const MAX_DATE = '2053-10-08';

const localToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const getDateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date();
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
    };
  }
  return { year, month, day };
};

const getDaysInYear = (year: number) =>
  Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000);

const getDayOfYear = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000);
};

const getDateFromDayOfYear = (year: number, dayOfYear: number) =>
  new Date(Date.UTC(year, 0, dayOfYear + 1)).toISOString().slice(0, 10);

const formatFullDate = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatShortDate = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};

const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const formatTime = (isoString: string | null, timezone: string) => {
  if (!isoString) return 'Indisponible';
  return new Date(isoString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
};

const formatDistance = (distance: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(distance);

const findCurrentPositionIndex = (positions: PositionPoint[]) => {
  if (positions.length === 0) return null;
  const now = Date.now();
  const firstTime = new Date(positions[0].time).getTime();
  const lastTime = new Date(positions[positions.length - 1].time).getTime();
  if (now < firstTime || now > lastTime) return null;

  let currentIndex = 0;
  for (let index = 0; index < positions.length; index += 1) {
    if (new Date(positions[index].time).getTime() > now) break;
    currentIndex = index;
  }
  return currentIndex;
};

const eventCards = (events: Events) => [
  { label: 'Lever du soleil', value: events.sunrise, icon: Sun, tone: 'text-amber-300', background: 'from-amber-400/15' },
  { label: 'Coucher du soleil', value: events.sunset, icon: Sun, tone: 'text-orange-300', background: 'from-orange-400/15' },
  { label: 'Lever de la lune', value: events.moonrise, icon: Moon, tone: 'text-slate-200', background: 'from-slate-300/10' },
  { label: 'Coucher de la lune', value: events.moonset, icon: Moon, tone: 'text-indigo-300', background: 'from-indigo-400/15' },
];

function SkyChart({ positions, selectedIndex, timezone, showMoon }: { positions: PositionPoint[]; selectedIndex: number; timezone: string; showMoon: boolean }) {
  const width = 680;
  const left = 52;
  const x = (index: number) => left + (index / Math.max(positions.length - 1, 1)) * width;
  const y = (altitude: number) => 20 + (90 - altitude);
  const sunPath = positions.map((point, index) => `${x(index)},${y(point.sun.altitude)}`).join(' ');
  const moonPath = positions.map((point, index) => `${x(index)},${y(point.moon.altitude)}`).join(' ');
  const tickIndexes = positions
    .map((_, index) => index)
    .filter((index) => index % 36 === 0 || index === positions.length - 1);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3">
      <svg viewBox="0 0 780 235" className="min-w-[620px]" role="img" aria-label="Trajectoire du Soleil et de la Lune selon leur altitude">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#312e81" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#0f172a" stopOpacity="0.15" />
            <stop offset="1" stopColor="#020617" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect x="52" y="20" width="680" height="180" rx="12" fill="url(#sky)" />
        <line x1="52" y1="110" x2="732" y2="110" stroke="#64748b" strokeDasharray="5 5" />
        <text x="8" y="25" fill="#94a3b8" fontSize="11">+90°</text>
        <text x="8" y="114" fill="#94a3b8" fontSize="11">0°</text>
        <text x="8" y="202" fill="#94a3b8" fontSize="11">−90°</text>
        <text x="58" y="104" fill="#94a3b8" fontSize="10">horizon</text>
        {tickIndexes.map((index) => (
          <g key={index}>
            <line x1={x(index)} y1="200" x2={x(index)} y2="205" stroke="#64748b" />
            <text x={x(index)} y="220" textAnchor="middle" fill="#94a3b8" fontSize="11">
              {formatTime(positions[index].time, timezone)}
            </text>
          </g>
        ))}
        <polyline points={sunPath} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {showMoon && <polyline points={moonPath} fill="none" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        <line x1={x(selectedIndex)} y1="20" x2={x(selectedIndex)} y2="200" stroke="#f8fafc" strokeOpacity="0.35" />
        <circle cx={x(selectedIndex)} cy={y(positions[selectedIndex].sun.altitude)} r="6" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
        {showMoon && <circle cx={x(selectedIndex)} cy={y(positions[selectedIndex].moon.altitude)} r="6" fill="#c7d2fe" stroke="#fff" strokeWidth="2" />}
      </svg>
    </div>
  );
}

function PositionCard({ name, icon: Icon, position, color }: { name: string; icon: typeof Sun; position: BodyPosition; color: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className={`flex items-center gap-2 text-lg font-bold ${color}`}><Icon size={21} /> {name}</h3>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${position.above_horizon ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
          {position.above_horizon ? <Eye size={13} /> : <EyeOff size={13} />}
          {position.above_horizon ? 'Visible' : 'Sous l’horizon'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Altitude</dt><dd className="mt-1 text-2xl font-bold text-white">{position.altitude.toFixed(1)}°</dd></div>
        <div><dt className="text-slate-500">Azimut</dt><dd className="mt-1 text-2xl font-bold text-white">{position.azimuth.toFixed(1)}°</dd></div>
        <div>
          <dt className="text-slate-500">Direction</dt>
          <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-200"><Navigation size={17} style={{ transform: `rotate(${position.azimuth - 45}deg)` }} /> {position.direction}</dd>
        </div>
        <div><dt className="text-slate-500">Distance</dt><dd className="mt-1 font-semibold text-slate-200">{formatDistance(position.distance_km)} km</dd></div>
      </dl>
    </article>
  );
}

export default function App() {
  const [date, setDate] = useState(localToday);
  const [lat, setLat] = useState('48.8566');
  const [lon, setLon] = useState('2.3522');
  const [timezone, setTimezone] = useState('Europe/Paris');
  const [cityId, setCityId] = useState('paris');
  const [data, setData] = useState<DayData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMoon, setShowMoon] = useState(true);
  const annualCalculationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => {
    if (annualCalculationTimer.current) clearTimeout(annualCalculationTimer.current);
  }, []);

  const selectCity = (id: string) => {
    setCityId(id);
    const city = CITIES.find((item) => item.id === id);
    if (!city) return;
    setLat(String(city.lat));
    setLon(String(city.lon));
    setTimezone(city.timezone);
    setData(null);
  };

  const fetchDay = async (requestedDate = date) => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setError('');
    setLoading(true);
    try {
      const response = await axios.get<DayData>('/api/day', {
        params: { date: requestedDate, lat, lon, timezone },
      });
      if (activeRequest !== requestId.current) return;
      setData(response.data);
      setSelectedIndex(
        findCurrentPositionIndex(response.data.positions)
          ?? Math.floor(response.data.positions.length / 2),
      );
    } catch (requestError) {
      if (activeRequest !== requestId.current) return;
      console.error('Error fetching day:', requestError);
      const detail = axios.isAxiosError(requestError) ? requestError.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Impossible de joindre le serveur de calcul.');
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  };

  const getUserLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas prise en charge par ce navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(4));
        setLon(position.coords.longitude.toFixed(4));
        setTimezone(deviceTimezone());
        setCityId('custom');
        setData(null);
      },
      () => setError('Impossible d’obtenir votre position. Saisissez les coordonnées manuellement.'),
    );
  };

  const currentPoint = data?.positions[selectedIndex];
  const currentPositionIndex = data ? findCurrentPositionIndex(data.positions) : null;
  const selectedYear = getDateParts(date).year;
  const selectedDayOfYear = getDayOfYear(date);
  const firstAvailableDay = selectedYear === 1899 ? getDayOfYear(MIN_DATE) : 0;
  const lastAvailableDay = selectedYear === 2053
    ? getDayOfYear(MAX_DATE)
    : getDaysInYear(selectedYear) - 1;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_#4338ca_0,_#0f172a_45%,_#020617_100%)] px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">Observatoire personnel</p>
          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-white md:text-6xl"><Sun className="text-amber-300" size={48} /> Soleil & Lune</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">Levers, couchers et trajectoires célestes toutes les 10 minutes, partout dans le monde.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-12">
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-black/20 md:p-8">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
            <label className="text-sm font-semibold text-slate-300">
              Ville
              <select value={cityId} onChange={(event) => selectCity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-400">
                <option value="custom">Coordonnées personnalisées</option>
                {CITIES.map((city) => <option key={city.id} value={city.id}>{city.name} — {city.country}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-300">
              Date
              <input type="date" min={MIN_DATE} max={MAX_DATE} value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); setData(null); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-400" />
            </label>
            <button type="button" onClick={getUserLocation} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 font-semibold text-indigo-200 transition hover:bg-indigo-500/20"><MapPin size={18} /> Ma position</button>
          </div>

          <div className="mt-5 rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-4 md:p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Parcourir l’année {selectedYear}</p>
                <p className="mt-1 capitalize text-lg font-bold text-white">{formatFullDate(date)}</p>
              </div>
              <p className="text-xs text-slate-500">Jour {selectedDayOfYear + 1} sur {getDaysInYear(selectedYear)}</p>
            </div>
            <input
              aria-label={`Choisir un jour de l’année ${selectedYear}`}
              type="range"
              min={firstAvailableDay}
              max={lastAvailableDay}
              value={selectedDayOfYear}
              onChange={(event) => {
                const nextDate = getDateFromDayOfYear(selectedYear, Number(event.target.value));
                setDate(nextDate);
                if (annualCalculationTimer.current) clearTimeout(annualCalculationTimer.current);
                annualCalculationTimer.current = setTimeout(() => {
                  annualCalculationTimer.current = null;
                  void fetchDay(nextDate);
                }, 300);
              }}
              className="mt-4 w-full accent-indigo-400"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-600">
              <span>{formatShortDate(getDateFromDayOfYear(selectedYear, firstAvailableDay))}</span>
              <span className="text-indigo-400/70">Calcul automatique</span>
              <span>{formatShortDate(getDateFromDayOfYear(selectedYear, lastAvailableDay))}</span>
            </div>
          </div>

          <details className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-400">Coordonnées et fuseau horaire</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-xs text-slate-500">Latitude<input type="number" min="-90" max="90" step="any" value={lat} onChange={(event) => { setLat(event.target.value); setCityId('custom'); setData(null); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label>
              <label className="text-xs text-slate-500">Longitude<input type="number" min="-180" max="180" step="any" value={lon} onChange={(event) => { setLon(event.target.value); setCityId('custom'); setData(null); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label>
              <label className="text-xs text-slate-500">Fuseau horaire<input type="text" value={timezone} onChange={(event) => { setTimezone(event.target.value); setData(null); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label>
            </div>
          </details>

          <button type="button" disabled={loading || !date || !lat || !lon || !timezone} onClick={() => void fetchDay()} className="mt-5 flex w-full items-center justify-center rounded-xl bg-indigo-500 py-3.5 font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <><Loader2 className="mr-2 animate-spin" /> Calcul en cours…</> : 'Afficher la journée'}
          </button>

          {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"><AlertCircle size={18} /> {error}</p>}
        </section>

        {data && currentPoint && (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Éphémérides</p><h2 className="text-2xl font-bold text-white">Moments clés</h2></div><span className="text-sm text-slate-500">Fuseau : {data.timezone}</span></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {eventCards(data.events).map(({ label, value, icon: Icon, tone, background }) => (
                  <article key={label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${background} to-slate-900 p-5`}>
                    <p className={`flex items-center gap-2 text-sm font-semibold ${tone}`}><Icon size={17} /> {label}</p>
                    <p className="mt-3 text-2xl font-black text-white">{formatTime(value, data.timezone)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Trajectoire céleste</p><h2 className="text-2xl font-bold text-white">Position durant la journée</h2></div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-indigo-400/30">
                    <input type="checkbox" checked={showMoon} onChange={(event) => setShowMoon(event.target.checked)} className="size-4 accent-indigo-400" />
                    <Moon size={16} className="text-indigo-200" /> Afficher la Lune
                  </label>
                  {currentPositionIndex !== null && (
                    <button type="button" onClick={() => setSelectedIndex(currentPositionIndex)} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20">Maintenant</button>
                  )}
                  <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 font-bold text-white"><Clock3 size={18} className="text-indigo-300" /> {formatTime(currentPoint.time, data.timezone)}</div>
                </div>
              </div>

              <SkyChart positions={data.positions} selectedIndex={selectedIndex} timezone={data.timezone} showMoon={showMoon} />

              <label className="mt-5 block text-sm font-semibold text-slate-400">
                Choisir l’heure — pas de 10 minutes
                <input aria-label="Choisir l’heure" type="range" min="0" max={data.positions.length - 1} value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))} className="mt-3 w-full accent-indigo-400" />
              </label>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PositionCard name="Soleil" icon={Sun} position={currentPoint.sun} color="text-amber-300" />
                {showMoon && <PositionCard name="Lune" icon={Moon} position={currentPoint.moon} color="text-indigo-200" />}
              </div>

              <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-500">
                <span><strong className="text-slate-300">Altitude :</strong> angle au-dessus de l’horizon</span>
                <span><strong className="text-slate-300">Azimut :</strong> 0° nord, 90° est, 180° sud, 270° ouest</span>
              </div>
            </section>
          </>
        )}
      </div>
      <footer className="border-t border-white/10 bg-slate-950/80 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-bold tracking-wide text-slate-200">Soleil & Lune</p>
            <p className="mt-1 text-xs text-slate-500">© 2026 PetiK. Tous droits réservés.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={14} className="text-indigo-400" aria-hidden="true" />
            <span>Conçu avec l’assistance de</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300">Gemini</span>
            <span className="text-slate-700">&</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300">Codex</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
