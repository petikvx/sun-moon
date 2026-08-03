import { useEffect, useState } from 'react';
import { Bell, BellRing, CloudMoon } from 'lucide-react';
import type { AlertPreferences, PositionPoint, WeatherHour } from '../types';

const defaults: AlertPreferences = { enabled: false, maxCloudCover: 25, minVisibilityKm: 10, requireMoonBelow: true, requireAstronomicalNight: true };
const readPreferences = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem('sun-moon-alerts') || '{}') } as AlertPreferences; } catch { return defaults; } };

async function notify(body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) await registration.showNotification('Soleil & Lune', { body, tag: 'sun-moon-observation' });
  else new Notification('Soleil & Lune', { body });
  return true;
}

export function ObservationAlerts({ point, weather, locationName, onNotice }: { point?: PositionPoint; weather: WeatherHour | null; locationName: string; onNotice: (message: string) => void }) {
  const [preferences, setPreferences] = useState<AlertPreferences>(readPreferences);
  const update = (next: AlertPreferences) => { setPreferences(next); localStorage.setItem('sun-moon-alerts', JSON.stringify(next)); };
  const matches = Boolean(point && weather && weather.cloudCover <= preferences.maxCloudCover && weather.visibility / 1000 >= preferences.minVisibilityKm && (!preferences.requireMoonBelow || !point.moon.above_horizon) && (!preferences.requireAstronomicalNight || point.sun.altitude <= -18));

  useEffect(() => {
    if (!preferences.enabled || !matches || !point) return;
    const key = `sun-moon-alert-${point.time.slice(0, 13)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, 'sent');
    void notify(`Bonnes conditions d’observation à ${locationName}. Nuages ${weather?.cloudCover}% et visibilité ${Math.round((weather?.visibility ?? 0) / 1000)} km.`);
  }, [locationName, matches, point, preferences.enabled, weather]);

  const enable = async () => {
    if (!('Notification' in window)) { onNotice('Les notifications ne sont pas disponibles dans ce navigateur.'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { onNotice('Autorisation de notification non accordée.'); return; }
    update({ ...preferences, enabled: true }); onNotice('Alerte locale activée.');
  };

  return <article className="rounded-3xl border border-violet-400/20 bg-slate-900 p-6" aria-labelledby="alerts-title"><div className="flex items-start gap-3"><BellRing className="text-violet-300"/><div><p className="text-sm font-bold uppercase tracking-wider text-violet-300">Alerte d’observation</p><h2 id="alerts-title" className="text-xl font-black">Mes critères</h2></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Nuages maximum : <strong>{preferences.maxCloudCover}%</strong><input aria-label="Nuages maximum" type="range" min="0" max="100" step="5" value={preferences.maxCloudCover} onChange={(event) => update({ ...preferences, maxCloudCover: Number(event.target.value) })} className="mt-2 w-full accent-violet-400"/></label><label className="text-sm text-slate-300">Visibilité minimum : <strong>{preferences.minVisibilityKm} km</strong><input aria-label="Visibilité minimum" type="range" min="1" max="50" value={preferences.minVisibilityKm} onChange={(event) => update({ ...preferences, minVisibilityKm: Number(event.target.value) })} className="mt-2 w-full accent-violet-400"/></label></div>
    <div className="mt-4 space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.requireMoonBelow} onChange={(event) => update({ ...preferences, requireMoonBelow: event.target.checked })} className="accent-violet-400"/> Lune sous l’horizon</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.requireAstronomicalNight} onChange={(event) => update({ ...preferences, requireAstronomicalNight: event.target.checked })} className="accent-violet-400"/> Nuit astronomique commencée</label></div>
    <div className={`mt-5 flex items-center gap-2 rounded-xl p-3 text-sm ${matches ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}><CloudMoon size={17}/>{matches ? 'Les critères sont réunis maintenant.' : 'Les critères ne sont pas encore réunis.'}</div>
    <button type="button" onClick={() => preferences.enabled ? update({ ...preferences, enabled: false }) : void enable()} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold ${preferences.enabled ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-500 text-white'}`}><Bell size={17}/>{preferences.enabled ? 'Désactiver l’alerte locale' : 'Autoriser et activer l’alerte'}</button><p className="mt-3 text-xs text-slate-500">L’alerte est évaluée tant que la page ou la PWA reste active. Une alerte push permanente demanderait un serveur d’abonnement.</p>
  </article>;
}
