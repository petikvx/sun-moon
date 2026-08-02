import type { PositionPoint, WeatherData, WeatherHour } from '../types';

export const localToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export const getDateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date();
    return { year: fallback.getFullYear(), month: fallback.getMonth() + 1, day: fallback.getDate() };
  }
  return { year, month, day };
};

export const getDaysInYear = (year: number) =>
  Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000);

export const getDayOfYear = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000);
};

export const getDateFromDayOfYear = (year: number, dayOfYear: number) =>
  new Date(Date.UTC(year, 0, dayOfYear + 1)).toISOString().slice(0, 10);

export const formatFullDate = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
};

export const formatShortDate = (value: string) => {
  const { year, month, day } = getDateParts(value);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });
};

export const formatTime = (isoString: string | null, timezone: string) => {
  if (!isoString) return 'Indisponible';
  return new Date(isoString).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone,
  });
};

export const formatDuration = (seconds: number | null) => {
  if (seconds === null) return 'Indisponible';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours} h ${String(minutes).padStart(2, '0')}`;
};

export const formatDistance = (distance: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(distance);

export const findCurrentPositionIndex = (positions: PositionPoint[]) => {
  if (!positions.length) return null;
  const now = Date.now();
  if (now < Date.parse(positions[0].time) || now > Date.parse(positions.at(-1)!.time)) return null;
  let index = 0;
  while (index + 1 < positions.length && Date.parse(positions[index + 1].time) <= now) index += 1;
  return index;
};

export const findWeatherForPoint = (weather: WeatherData | null, point: PositionPoint, timezone: string): WeatherHour | null => {
  if (!weather) return null;
  const localHour = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', timeZone: timezone,
  }).format(new Date(point.time)).replace(' ', 'T').slice(0, 13);
  return weather.hours.find((hour) => hour.time.startsWith(localHour)) ?? null;
};

export const observationScore = (weather: WeatherHour) => {
  const visibilityBonus = Math.min(weather.visibility / 1000, 20);
  const humidityPenalty = Math.max(weather.humidity - 60, 0) * 0.25;
  return Math.max(0, Math.min(100, Math.round(100 - weather.cloudCover * 0.8 - humidityPenalty + visibilityBonus)));
};

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
