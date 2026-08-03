import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle, CalendarDays, Camera, Clock3, Cloud, Download, FileJson,
  Heart, Loader2, MapPin, Moon, Radio, Share2, Sparkles, Sun,
} from 'lucide-react';
import { CITIES, MAX_DATE, MIN_DATE } from './cities';
import { LocationSearch } from './components/LocationSearch';
import { LocationMap } from './components/LocationMap';
import { ForecastPanel } from './components/ForecastPanel';
import { ObservationAlerts } from './components/ObservationAlerts';
import { PositionCard } from './components/PositionCard';
import { SkyChart } from './components/SkyChart';
import { SkyDome } from './components/SkyDome';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { getSevenDayWeather, getWeather, resolveTimezone } from './services/openMeteo';
import type { AstronomyForecast, City, DayData, Events, GeocodingResult, ObservationForecastDay, ThemeMode, WeatherData } from './types';
import {
  deviceTimezone, findCurrentPositionIndex, findWeatherForPoint, formatDuration,
  formatFullDate, formatShortDate, formatTime, getDateFromDayOfYear,
  getDateParts, getDayOfYear, getDaysInYear, localToday, observationScore,
} from './utils/astronomy';
import { exportChartPng, exportCsv, exportIcs, exportJson } from './utils/export';
import { mergeForecast } from './utils/forecast';

const readQuery = (key: string, fallback: string) => new URLSearchParams(window.location.search).get(key) || fallback;

const eventCards = (events: Events) => [
  { label: 'Lever du soleil', value: events.sunrise, icon: Sun, tone: 'text-amber-300', background: 'from-amber-400/15' },
  { label: 'Coucher du soleil', value: events.sunset, icon: Sun, tone: 'text-orange-300', background: 'from-orange-400/15' },
  { label: 'Lever de la lune', value: events.moonrise, icon: Moon, tone: 'text-slate-200', background: 'from-slate-300/10' },
  { label: 'Coucher de la lune', value: events.moonset, icon: Moon, tone: 'text-indigo-300', background: 'from-indigo-400/15' },
];

const loadFavorites = (): City[] => {
  try { return JSON.parse(localStorage.getItem('sun-moon-favorites') || '[]') as City[]; } catch { return []; }
};

const loadTheme = (): ThemeMode => {
  const saved = localStorage.getItem('sun-moon-theme');
  return saved === 'dark' || saved === 'light' || saved === 'contrast' ? saved : 'auto';
};

export default function App() {
  const [date, setDate] = useState(() => readQuery('date', localToday()));
  const [lat, setLat] = useState(() => readQuery('lat', '48.8566'));
  const [lon, setLon] = useState(() => readQuery('lon', '2.3522'));
  const [timezone, setTimezone] = useState(() => readQuery('timezone', 'Europe/Paris'));
  const [cityId, setCityId] = useState('paris');
  const [locationName, setLocationName] = useState(() => readQuery('location', 'Paris'));
  const [data, setData] = useState<DayData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ObservationForecastDay[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showMoon, setShowMoon] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [favorites, setFavorites] = useState<City[]>(loadFavorites);
  const [theme, setTheme] = useState<ThemeMode>(loadTheme);
  const [mapLoading, setMapLoading] = useState(false);
  const annualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const initialFetchStarted = useRef(false);

  useEffect(() => () => { if (annualTimer.current) clearTimeout(annualTimer.current); }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'auto' ? (media.matches ? 'dark' : 'light') : theme; };
    apply(); localStorage.setItem('sun-moon-theme', theme);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    if (!liveMode || !data) return;
    const sync = () => { const index = findCurrentPositionIndex(data.positions); if (index !== null) setSelectedIndex(index); };
    sync();
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, [liveMode, data]);

  const applyLocation = (city: Pick<City, 'name' | 'lat' | 'lon' | 'timezone'>, id = 'custom') => {
    setCityId(id); setLocationName(city.name); setLat(String(city.lat)); setLon(String(city.lon)); setTimezone(city.timezone); setData(null); setWeather(null); setForecast([]);
  };

  const selectCity = (id: string) => {
    const city = [...CITIES, ...favorites].find((item) => item.id === id);
    if (city) applyLocation(city, id); else setCityId('custom');
  };

  const selectSearchResult = (result: GeocodingResult) => applyLocation({
    name: `${result.name}${result.country ? `, ${result.country}` : ''}`,
    lat: result.latitude, lon: result.longitude, timezone: result.timezone,
  });

  const fetchDay = async (requestedDate = date) => {
    const activeRequest = ++requestId.current;
    setError(''); setLoading(true);
    try {
      const forecastStart = localToday();
      const [dayResponse, weatherResponse, astronomyResponse, forecastWeather] = await Promise.all([
        axios.get<DayData>('/api/day', { params: { date: requestedDate, lat, lon, timezone } }),
        getWeather(Number(lat), Number(lon), requestedDate, timezone),
        axios.get<AstronomyForecast>('/api/forecast', { params: { start: forecastStart, days: 7, lat, lon, timezone } }),
        getSevenDayWeather(Number(lat), Number(lon), timezone),
      ]);
      if (activeRequest !== requestId.current) return;
      setData(dayResponse.data); setWeather(weatherResponse);
      setForecast(mergeForecast(astronomyResponse.data, forecastWeather));
      setSelectedIndex(findCurrentPositionIndex(dayResponse.data.positions) ?? Math.floor(dayResponse.data.positions.length / 2));
      const query = new URLSearchParams({ date: requestedDate, lat, lon, timezone, location: locationName });
      window.history.replaceState({}, '', `${window.location.pathname}?${query}`);
    } catch (requestError) {
      if (activeRequest !== requestId.current) return;
      const detail = axios.isAxiosError(requestError) ? requestError.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Impossible de joindre le serveur de calcul.');
    } finally { if (activeRequest === requestId.current) setLoading(false); }
  };

  useEffect(() => {
    if (initialFetchStarted.current) return;
    initialFetchStarted.current = true;
    void fetchDay();
  // The initial URL/default state is intentionally loaded once; later updates are explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) { setError('La géolocalisation n’est pas prise en charge.'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => applyLocation({ name: 'Ma position', lat: position.coords.latitude, lon: position.coords.longitude, timezone: deviceTimezone() }),
      () => setError('Impossible d’obtenir votre position.'),
    );
  };

  const selectMapPoint = async (nextLat: number, nextLon: number) => {
    setMapLoading(true); setError('');
    try {
      const detectedTimezone = await resolveTimezone(nextLat, nextLon);
      applyLocation({ name: `Carte ${nextLat.toFixed(3)}, ${nextLon.toFixed(3)}`, lat: nextLat, lon: nextLon, timezone: detectedTimezone });
      setNotice(`Lieu choisi — fuseau ${detectedTimezone}`);
    } catch {
      applyLocation({ name: `Carte ${nextLat.toFixed(3)}, ${nextLon.toFixed(3)}`, lat: nextLat, lon: nextLon, timezone: deviceTimezone() });
      setNotice('Lieu choisi ; fuseau de l’appareil utilisé faute de réponse réseau.');
    } finally { setMapLoading(false); }
  };

  const toggleFavorite = () => {
    const key = `${Number(lat).toFixed(4)}:${Number(lon).toFixed(4)}`;
    const exists = favorites.some((favorite) => favorite.id === key);
    const next = exists ? favorites.filter((favorite) => favorite.id !== key) : [...favorites, { id: key, name: locationName, country: 'Favori', lat: Number(lat), lon: Number(lon), timezone }];
    setFavorites(next); localStorage.setItem('sun-moon-favorites', JSON.stringify(next)); setNotice(exists ? 'Favori retiré' : 'Lieu ajouté aux favoris');
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: 'Soleil & Lune', url });
    else await navigator.clipboard.writeText(url);
    setNotice('Lien de partage prêt');
  };

  const currentPoint = data?.positions[selectedIndex];
  const currentPositionIndex = data ? findCurrentPositionIndex(data.positions) : null;
  const selectedYear = getDateParts(date).year;
  const selectedDay = getDayOfYear(date);
  const firstDay = selectedYear === 1899 ? getDayOfYear(MIN_DATE) : 0;
  const lastDay = selectedYear === 2053 ? getDayOfYear(MAX_DATE) : getDaysInYear(selectedYear) - 1;
  const currentWeather = data && currentPoint ? findWeatherForPoint(weather, currentPoint, data.timezone) : null;
  const isFavorite = favorites.some((favorite) => favorite.id === `${Number(lat).toFixed(4)}:${Number(lon).toFixed(4)}`);

  return (<>
    <a href="#main-content" className="skip-link">Aller au contenu principal</a>
    <main id="main-content" className="app-shell min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_#4338ca_0,_#0f172a_45%,_#020617_100%)] px-4 py-12 md:py-16"><div className="mx-auto max-w-6xl"><div className="mb-5 flex items-center justify-between gap-4"><p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-300">Observatoire personnel</p><ThemeSwitcher value={theme} onChange={setTheme}/></div><h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-white md:text-6xl"><Sun className="text-amber-300" size={48} aria-hidden="true" /> Soleil & Lune</h1><p className="mt-4 max-w-3xl text-lg text-slate-300">Éphémérides, lumière, phase lunaire, météo et trajectoires célestes toutes les 10 minutes.</p></div></header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-12">
        <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl md:p-8">
          <div className="grid gap-5 lg:grid-cols-2"><LocationSearch onSelect={selectSearchResult} /><label className="text-sm font-semibold text-slate-300">Villes et favoris<select value={cityId} onChange={(event) => selectCity(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"><option value="custom">{locationName} — personnalisé</option>{CITIES.map((city) => <option key={city.id} value={city.id}>{city.name} — {city.country}</option>)}{favorites.map((city) => <option key={city.id} value={city.id}>★ {city.name}</option>)}</select></label></div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]"><label className="text-sm font-semibold text-slate-300">Date<input type="date" min={MIN_DATE} max={MAX_DATE} value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); setData(null); }} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white" /></label><button type="button" onClick={getUserLocation} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 font-semibold text-indigo-200"><MapPin size={18} /> Ma position</button><button type="button" onClick={toggleFavorite} className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-300"><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-rose-400' : ''} /> Favori</button></div>
          <div className="mt-5 rounded-2xl border border-indigo-400/15 bg-indigo-500/5 p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Parcourir l’année {selectedYear}</p><p className="mt-1 capitalize text-lg font-bold text-white">{formatFullDate(date)}</p></div><p className="text-xs text-slate-500">Jour {selectedDay + 1} sur {getDaysInYear(selectedYear)}</p></div><input type="range" min={firstDay} max={lastDay} value={selectedDay} onChange={(event) => { const nextDate = getDateFromDayOfYear(selectedYear, Number(event.target.value)); setDate(nextDate); if (annualTimer.current) clearTimeout(annualTimer.current); annualTimer.current = setTimeout(() => void fetchDay(nextDate), 300); }} className="mt-4 w-full accent-indigo-400" /><div className="mt-1 flex justify-between text-[11px] text-slate-600"><span>{formatShortDate(getDateFromDayOfYear(selectedYear, firstDay))}</span><span className="text-indigo-400/70">Calcul automatique</span><span>{formatShortDate(getDateFromDayOfYear(selectedYear, lastDay))}</span></div></div>
          <details className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-400">Coordonnées et fuseau horaire</summary><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-xs text-slate-500">Latitude<input type="number" value={lat} onChange={(event) => { setLat(event.target.value); setCityId('custom'); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label><label className="text-xs text-slate-500">Longitude<input type="number" value={lon} onChange={(event) => { setLon(event.target.value); setCityId('custom'); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label><label className="text-xs text-slate-500">Fuseau<input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-white" /></label></div></details>
          <button type="button" disabled={loading} onClick={() => void fetchDay()} className="mt-5 flex w-full items-center justify-center rounded-xl bg-indigo-500 py-3.5 font-bold text-white hover:bg-indigo-400 disabled:opacity-50">{loading ? <><Loader2 className="mr-2 animate-spin" /> Calcul en cours…</> : 'Afficher la journée'}</button>
          {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-200"><AlertCircle size={18} /> {error}</p>}{notice && <button type="button" role="status" aria-live="polite" onClick={() => setNotice('')} className="mt-3 w-full rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</button>}
        </section>

        <LocationMap lat={Number(lat)} lon={Number(lon)} onSelect={(nextLat, nextLon) => void selectMapPoint(nextLat, nextLon)} />
        {mapLoading && <p role="status" className="flex items-center justify-center gap-2 text-sm text-indigo-300"><Loader2 className="animate-spin" size={16}/> Détection du fuseau horaire…</p>}

        {data && currentPoint && <>
          {forecast.length > 0 && <ForecastPanel days={forecast} timezone={timezone} onSelectDate={(nextDate) => { setDate(nextDate); void fetchDay(nextDate); }} />}
          <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Éphémérides</p><h2 className="text-2xl font-bold">Moments clés</h2></div><span className="text-sm text-slate-500">{locationName} · {data.timezone}</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{eventCards(data.events).map(({ label, value, icon: Icon, tone, background }) => <article key={label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${background} to-slate-900 p-5`}><p className={`flex items-center gap-2 text-sm font-semibold ${tone}`}><Icon size={17} /> {label}</p><p className="mt-3 text-2xl font-black">{formatTime(value, data.timezone)}</p></article>)}</div></section>

          <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 to-slate-900 p-6"><div className="flex items-start gap-5"><div className="grid size-24 shrink-0 place-items-center rounded-full border border-indigo-200/30 bg-slate-950 shadow-[inset_-18px_0_0_#020617]" style={{ opacity: 0.45 + data.moon_details.illumination_percent / 180 }}><Moon size={52} className="text-indigo-100" /></div><div><p className="text-sm font-bold uppercase tracking-wider text-indigo-300">Phase lunaire</p><h2 className="mt-1 text-2xl font-black">{data.moon_details.phase_name}</h2><p className="mt-2 text-slate-300">{data.moon_details.illumination_percent}% éclairée · âge {data.moon_details.age_days} jours</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.moon_details.next_phases.slice(0, 4).map((phase) => <div key={phase.time} className="rounded-xl bg-white/5 p-3"><p className="text-xs text-slate-500">{phase.name}</p><p className="mt-1 text-sm font-semibold">{new Date(phase.time).toLocaleDateString('fr-FR', { timeZone: data.timezone, day: 'numeric', month: 'short' })} · {formatTime(phase.time, data.timezone)}</p></div>)}</div></article>
          <article className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-slate-900 p-6"><p className="text-sm font-bold uppercase tracking-wider text-amber-300">Lumière du jour</p><h2 className="mt-1 text-2xl font-black">{formatDuration(data.light.day_length_seconds)}</h2><div className="mt-5 grid grid-cols-2 gap-3 text-sm">{[['Aube astronomique', data.light.astronomical_dawn], ['Aube civile', data.light.civil_dawn], ['Heure dorée matin', data.light.golden_hour_morning_start], ['Heure dorée soir', data.light.golden_hour_evening_start], ['Crépuscule civil', data.light.civil_dusk], ['Nuit astronomique', data.light.astronomical_dusk]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/5 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{formatTime(value as string | null, data.timezone)}</p></div>)}</div><p className="mt-4 text-xs text-slate-500">Heures bleues : {formatTime(data.light.blue_hour_morning_start, data.timezone)}–{formatTime(data.light.blue_hour_morning_end, data.timezone)} et {formatTime(data.light.blue_hour_evening_start, data.timezone)}–{formatTime(data.light.blue_hour_evening_end, data.timezone)}</p></article></section>

          <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Trajectoire céleste</p><h2 className="text-2xl font-bold">Position durant la journée</h2></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm"><input type="checkbox" checked={showMoon} onChange={(event) => setShowMoon(event.target.checked)} className="accent-indigo-400" /><Moon size={16} /> Lune</label><button type="button" onClick={() => setLiveMode(!liveMode)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${liveMode ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}><Radio size={16} /> Temps réel</button>{currentPositionIndex !== null && <button type="button" onClick={() => setSelectedIndex(currentPositionIndex)} className="rounded-xl bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">Maintenant</button>}<div className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 font-bold"><Clock3 size={18} /> {formatTime(currentPoint.time, data.timezone)}</div></div></div>
            <SkyChart positions={data.positions} selectedIndex={selectedIndex} timezone={data.timezone} showMoon={showMoon} /><label className="mt-5 block text-sm font-semibold text-slate-400">Choisir l’heure — pas de 10 minutes<input type="range" min="0" max={data.positions.length - 1} value={selectedIndex} onChange={(event) => { setLiveMode(false); setSelectedIndex(Number(event.target.value)); }} className="mt-3 w-full accent-indigo-400" /></label>
            <div className="mt-6 grid gap-4 lg:grid-cols-2"><PositionCard name="Soleil" icon={Sun} position={currentPoint.sun} color="text-amber-300" />{showMoon && <PositionCard name="Lune" icon={Moon} position={currentPoint.moon} color="text-indigo-200" />}</div><div className="mt-4"><SkyDome positions={data.positions} currentIndex={selectedIndex} showMoon={showMoon}/></div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3"><article className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-6"><div className="flex items-center gap-3"><Cloud className="text-cyan-300" /><div><p className="text-sm font-bold uppercase tracking-wider text-cyan-300">Conditions d’observation</p><h2 className="text-xl font-black">{currentWeather ? `Score ${observationScore(currentWeather)}/100` : 'Prévision indisponible'}</h2></div></div>{currentWeather ? <dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-xs text-slate-500">Nuages</dt><dd className="text-xl font-bold">{currentWeather.cloudCover}%</dd></div><div><dt className="text-xs text-slate-500">Visibilité</dt><dd className="text-xl font-bold">{Math.round(currentWeather.visibility / 1000)} km</dd></div><div><dt className="text-xs text-slate-500">Humidité</dt><dd className="text-xl font-bold">{currentWeather.humidity}%</dd></div><div><dt className="text-xs text-slate-500">Température</dt><dd className="text-xl font-bold">{currentWeather.temperature}°C</dd></div></dl> : <p className="mt-4 text-sm text-slate-500">La météo est proposée pour les dates couvertes par les prévisions Open-Meteo.</p>}<p className="mt-4 text-[11px] text-slate-600">Données météo : Open-Meteo</p></article>
          <ObservationAlerts point={currentPoint} weather={currentWeather} locationName={locationName} onNotice={setNotice}/>
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6"><p className="text-sm font-bold uppercase tracking-wider text-slate-500">Partager et exporter</p><div className="mt-4 grid grid-cols-2 gap-3"><button onClick={() => void share()} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-3 font-semibold"><Share2 size={17} /> Partager</button><button onClick={() => exportIcs(data, date)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3"><CalendarDays size={17} /> Calendrier</button><button onClick={() => exportCsv(data, date)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3"><Download size={17} /> CSV</button><button onClick={() => exportJson(data, date)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3"><FileJson size={17} /> JSON</button><button onClick={exportChartPng} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3"><Camera size={17} /> Image PNG du graphique</button></div></article></section>
        </>}
      </div>
      <footer className="border-t border-white/10 px-4 py-8"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row"><div><p className="font-bold">Soleil & Lune</p><p className="text-xs text-slate-500">© 2026 PetiK. Tous droits réservés.</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><Sparkles size={14} /> Conçu avec l’assistance de <span className="rounded-full bg-white/5 px-2 py-1">Gemini</span> & <span className="rounded-full bg-white/5 px-2 py-1">Codex</span></div></div></footer>
    </main>
  </>);
}
